import { AppointmentRepository, AppointmentStatusValue } from "@/repositories/appointment.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { OfferRepository } from "@/repositories/offer.repository";
import { AvailabilityRepository } from "@/repositories/availability.repository";
import { UnavailabilityRepository } from "@/repositories/unavailability.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { toLocalMoment, timeColumnToMinutes, dateColumnToText } from "@/lib/datetime";
import { Role } from "@/lib/auth";

// Données reçues pour réserver
export interface CreateAppointmentInput {
    professionalId: number;
    serviceId: number;
    startDatetime: string;
    notes?: string | null;
}

// Ce que l'on renvoie à la création (dates en UTC)
export interface AppointmentItem {
    id: number;
    startDatetime: string;
    endDatetime: string;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: number | null;
    clientId: number;
    professionalId: number;
    serviceId: number;
}

// Ce que l'on renvoie à la lecture : le rendez-vous avec son service, son professionnel et son client
export interface AppointmentDetail {
    id: number;
    startDatetime: string;
    endDatetime: string;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: number | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    service: { id: number; name: string };
    professional: { userId: number; firstName: string; lastName: string; specialty: string | null };
    client: { userId: number; firstName: string; lastName: string; phoneNumber: string | null };
}

// Forme d'un rendez-vous tel que le repository le renvoie après sa création
interface AppointmentRow {
    id: number;
    startDatetime: Date;
    endDatetime: Date;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: object | null;
    clientId: number;
    professionalId: number;
    serviceId: number;
}

// Forme d'un rendez-vous tel que le repository le renvoie à la lecture
interface AppointmentDetailRow {
    id: number;
    startDatetime: Date;
    endDatetime: Date;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: object | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    clientId: number;
    professionalId: number;
    service: { id: number; name: string };
    client: { user: { firstName: string; lastName: string; phoneNumber: string | null } };
    professional: { specialty: string | null; user: { firstName: string; lastName: string } };
}

// Une plage horaire, en minutes depuis minuit
interface TimeBlock {
    start: number;
    end: number;
}

export class AppointmentService {
    private appointmentRepository: AppointmentRepository;
    private professionalRepository: ProfessionalRepository;
    private offerRepository: OfferRepository;
    private availabilityRepository: AvailabilityRepository;
    private unavailabilityRepository: UnavailabilityRepository;

    constructor(
        appointmentRepository: AppointmentRepository,
        professionalRepository: ProfessionalRepository,
        offerRepository: OfferRepository,
        availabilityRepository: AvailabilityRepository,
        unavailabilityRepository: UnavailabilityRepository
    ) {
        this.appointmentRepository = appointmentRepository;
        this.professionalRepository = professionalRepository;
        this.offerRepository = offerRepository;
        this.availabilityRepository = availabilityRepository;
        this.unavailabilityRepository = unavailabilityRepository;
    }

    // Réserve un rendez-vous pour un client
    async create(clientId: number, input: CreateAppointmentInput): Promise<AppointmentItem> {
        // Règle 1 : le professionnel existe
        const professional = await this.professionalRepository.findById(input.professionalId);
        if (!professional) {
            throw new NotFoundError("Professionnel introuvable");
        }

        // Règle 2 : le professionnel propose ce service
        const offer = await this.offerRepository.findOne(input.professionalId, input.serviceId);
        if (!offer) {
            throw new NotFoundError("Ce service n'est pas proposé par ce professionnel");
        }

        // Règle 3 : le début est à une minute pile, et dans le futur
        const start = new Date(input.startDatetime);
        if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) {
            throw new ValidationError("Le rendez-vous doit commencer à une minute pile (secondes à 00)", []);
        }
        if (start.getTime() <= Date.now()) {
            throw new ValidationError("Le rendez-vous doit être dans le futur", []);
        }

        // Durée et prix effectifs : ceux de l'offre s'ils existent, sinon ceux du catalogue
        let duration = offer.service.duration;
        if (offer.customDuration !== null) {
            duration = offer.customDuration;
        }

        let price = Number(offer.service.price);
        if (offer.customPrice !== null) {
            price = Number(offer.customPrice);
        }

        // L'heure de fin est calculée
        const end = new Date(start.getTime() + duration * 60 * 1000);

        // Règle 4 : le rendez-vous tient dans les disponibilités du professionnel
        const isInside = await this.isInsideAvailabilities(input.professionalId, start, end);
        if (isInside === false) {
            throw new ConflictError("Ce créneau est en dehors des horaires du professionnel");
        }

        // Règle 5 : pas d'indisponibilité sur la période
        const absences = await this.unavailabilityRepository.findOverlapping(input.professionalId, start, end);
        if (absences.length > 0) {
            throw new ConflictError("Le professionnel est indisponible à cette période");
        }

        // Règle 6 : pas d'autre rendez-vous (non annulé) sur la période
        const others = await this.appointmentRepository.findOverlapping(input.professionalId, start, end);
        if (others.length > 0) {
            throw new ConflictError("Ce créneau est déjà réservé");
        }

        let notes: string | null = null;
        if (input.notes !== undefined && input.notes !== null) {
            notes = input.notes;
        }

        const row = await this.appointmentRepository.create({
            clientId: clientId,
            professionalId: input.professionalId,
            serviceId: input.serviceId,
            startDatetime: start,
            endDatetime: end,
            priceAtBooking: price,
            notes: notes,
        });
        return this.toItem(row);
    }

    // Liste mes rendez-vous : ceux que j'ai réservés (client) ou reçus (professionnel)
    async listMine(userId: number, role: Role, status: AppointmentStatusValue | undefined): Promise<AppointmentDetail[]> {
        if (role === "CLIENT") {
            const clientRows = await this.appointmentRepository.findForClient(userId, status);
            return this.toDetailList(clientRows);
        }

        const professionalRows = await this.appointmentRepository.findForProfessional(userId, status);
        return this.toDetailList(professionalRows);
    }

    // Lit un rendez-vous, seulement s'il me concerne (sinon "introuvable", pour ne pas révéler qu'il existe)
    async getById(userId: number, role: Role, appointmentId: number): Promise<AppointmentDetail> {
        const row = await this.appointmentRepository.findById(appointmentId);
        if (!row) {
            throw new NotFoundError("Rendez-vous introuvable");
        }

        if (this.isParticipant(row, userId, role) === false) {
            throw new NotFoundError("Rendez-vous introuvable");
        }

        return this.toDetail(row);
    }

    // Annule un rendez-vous (par le client ou par le professionnel concerné)
    async cancel(userId: number, role: Role, appointmentId: number, reason?: string | null): Promise<AppointmentDetail> {
        const row = await this.appointmentRepository.findById(appointmentId);
        if (!row) {
            throw new NotFoundError("Rendez-vous introuvable");
        }

        // Seules les personnes concernées peuvent annuler
        if (this.isParticipant(row, userId, role) === false) {
            throw new NotFoundError("Rendez-vous introuvable");
        }

        // Règle 1 : seul un rendez-vous en attente ou confirmé peut être annulé
        if (row.status === "CANCELLED") {
            throw new ConflictError("Ce rendez-vous est déjà annulé");
        }
        if (row.status !== "PENDING" && row.status !== "CONFIRMED") {
            throw new ConflictError("Un rendez-vous terminé ne peut pas être annulé");
        }

        // Règle 2 : on ne peut pas annuler un rendez-vous déjà commencé
        if (row.startDatetime.getTime() <= Date.now()) {
            throw new ConflictError("Un rendez-vous déjà commencé ne peut pas être annulé");
        }

        let cleanReason: string | null = null;
        if (reason !== undefined && reason !== null) {
            cleanReason = reason;
        }

        const updated = await this.appointmentRepository.cancel(appointmentId, new Date(), cleanReason);
        return this.toDetail(updated);
    }

    // Une personne est concernée par un rendez-vous si elle en est le client ou le professionnel
    private isParticipant(row: AppointmentDetailRow, userId: number, role: Role): boolean {
        if (role === "CLIENT" && row.clientId === userId) {
            return true;
        }
        if (role === "PROFESSIONAL" && row.professionalId === userId) {
            return true;
        }
        return false;
    }

    // Vérifie que tout le rendez-vous est couvert par les disponibilités du jour (heure locale)
    private async isInsideAvailabilities(professionalId: number, start: Date, end: Date): Promise<boolean> {
        const startLocal = toLocalMoment(start);
        const endLocal = toLocalMoment(end);

        // Un rendez-vous qui passe minuit ne peut pas tenir dans une disponibilité
        if (endLocal.dateText !== startLocal.dateText) {
            return false;
        }

        const blocks = await this.availabilityRepository.findByProfessionalAndDay(professionalId, startLocal.dayOfWeek);

        // On garde les plages valables ce jour-là (validFrom et validTo sont facultatifs)
        const validBlocks: TimeBlock[] = [];
        for (const block of blocks) {
            let isValid = true;

            if (block.validFrom !== null && dateColumnToText(block.validFrom) > startLocal.dateText) {
                isValid = false;
            }
            if (block.validTo !== null && dateColumnToText(block.validTo) < startLocal.dateText) {
                isValid = false;
            }

            if (isValid) {
                validBlocks.push({
                    start: timeColumnToMinutes(block.startTime),
                    end: timeColumnToMinutes(block.endTime),
                });
            }
        }

        // On avance de plage en plage depuis le début du rendez-vous,
        // jusqu'à couvrir toute sa durée (ou rencontrer un trou)
        let current = startLocal.minutes;
        let moved = true;

        while (moved && current < endLocal.minutes) {
            moved = false;

            for (const block of validBlocks) {
                if (block.start <= current && block.end > current) {
                    current = block.end;
                    moved = true;
                }
            }
        }

        return current >= endLocal.minutes;
    }

    // Transforme un rendez-vous tout juste créé en réponse simple (dates en UTC, prix en nombre)
    private toItem(row: AppointmentRow): AppointmentItem {
        let priceAtBooking: number | null = null;
        if (row.priceAtBooking !== null) {
            priceAtBooking = Number(row.priceAtBooking);
        }

        return {
            id: row.id,
            startDatetime: row.startDatetime.toISOString(),
            endDatetime: row.endDatetime.toISOString(),
            status: row.status,
            notes: row.notes,
            location: row.location,
            priceAtBooking: priceAtBooking,
            clientId: row.clientId,
            professionalId: row.professionalId,
            serviceId: row.serviceId,
        };
    }

    // Transforme plusieurs rendez-vous en réponses détaillées
    private toDetailList(rows: AppointmentDetailRow[]): AppointmentDetail[] {
        const result: AppointmentDetail[] = [];
        for (const row of rows) {
            result.push(this.toDetail(row));
        }
        return result;
    }

    // Transforme un rendez-vous avec ses relations en réponse détaillée
    private toDetail(row: AppointmentDetailRow): AppointmentDetail {
        let priceAtBooking: number | null = null;
        if (row.priceAtBooking !== null) {
            priceAtBooking = Number(row.priceAtBooking);
        }

        let cancelledAt: string | null = null;
        if (row.cancelledAt !== null) {
            cancelledAt = row.cancelledAt.toISOString();
        }

        return {
            id: row.id,
            startDatetime: row.startDatetime.toISOString(),
            endDatetime: row.endDatetime.toISOString(),
            status: row.status,
            notes: row.notes,
            location: row.location,
            priceAtBooking: priceAtBooking,
            cancelledAt: cancelledAt,
            cancellationReason: row.cancellationReason,
            service: { id: row.service.id, name: row.service.name },
            professional: {
                userId: row.professionalId,
                firstName: row.professional.user.firstName,
                lastName: row.professional.user.lastName,
                specialty: row.professional.specialty,
            },
            client: {
                userId: row.clientId,
                firstName: row.client.user.firstName,
                lastName: row.client.user.lastName,
                phoneNumber: row.client.user.phoneNumber,
            },
        };
    }
}