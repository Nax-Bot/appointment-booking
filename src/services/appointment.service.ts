import { AppointmentRepository, AppointmentStatusValue } from "@/repositories/appointment.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { OfferRepository } from "@/repositories/offer.repository";
import { AvailabilityRepository } from "@/repositories/availability.repository";
import { UnavailabilityRepository } from "@/repositories/unavailability.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/server/http/errors";
import { toLocalMoment, timeColumnToMinutes, dateColumnToText } from "@/lib/shared/datetime";
import { Role } from "@/lib/server/auth/auth";
import { TimeBlock, mergeTimeBlocks, isOnSlotGrid, SLOT_STEP_MINUTES } from "@/lib/server/booking/slot-grid";
import { UNPAID_HOLD_MINUTES, UNPAID_CANCEL_REASON } from "@/lib/server/payments/payment-rules";
import type { AppointmentNotifier } from "@/services/appointment-notifier.service";
import type { TransactionRunner, DbClient } from "@/lib/server/db/transaction-runner";

// Données reçues pour réserver
export interface CreateAppointmentInput {
    professionalId: number;
    serviceId: number;
    startDatetime: string;
    notes?: string | null;
}

// Données reçues pour qu'un professionnel ajoute un rendez-vous à la main
export interface CreateManualAppointmentInput {
    serviceId: number;
    startDatetime: string;
    guestName: string;
    guestPhone?: string | null;
    notes?: string | null;
}

// Ce que l'on renvoie à la création d'une réservation (dates en UTC)
export interface AppointmentItem {
    id: number;
    startDatetime: string;
    endDatetime: string;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: number | null;
    clientId: number | null;
    professionalId: number;
    serviceId: number;
}

// Ce que l'on renvoie à la lecture : le rendez-vous avec son service, son professionnel et son client.
// Pour un client avec compte : "client" est rempli et "guest" vaut null.
// Pour un client sans compte (invité) : "client" vaut null et "guest" est rempli.
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
    client: { userId: number; firstName: string; lastName: string; phoneNumber: string | null } | null;
    guest: { name: string; phoneNumber: string | null } | null;
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
    clientId: number | null;
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
    guestName: string | null;
    guestPhone: string | null;
    clientId: number | null;
    professionalId: number;
    service: { id: number; name: string };
    client: { user: { firstName: string; lastName: string; phoneNumber: string | null } } | null;
    professional: { specialty: string | null; user: { firstName: string; lastName: string } };
}

// Résultat de la vérification des horaires du professionnel
type ScheduleCheck = "OK" | "OUTSIDE_HOURS" | "OFF_GRID";

export class AppointmentService {
    // Facultatif : sans lui, aucun email n'est envoyé (c'est le cas dans les tests)
    private notifier: AppointmentNotifier | null;
    private appointmentRepository: AppointmentRepository;
    private professionalRepository: ProfessionalRepository;
    private offerRepository: OfferRepository;
    private availabilityRepository: AvailabilityRepository;
    private unavailabilityRepository: UnavailabilityRepository;
    private transactionRunner: TransactionRunner;

    constructor(
        appointmentRepository: AppointmentRepository,
        professionalRepository: ProfessionalRepository,
        offerRepository: OfferRepository,
        availabilityRepository: AvailabilityRepository,
        unavailabilityRepository: UnavailabilityRepository,
        transactionRunner: TransactionRunner,
        notifier?: AppointmentNotifier
    ) {
        this.notifier = notifier ?? null;
        this.appointmentRepository = appointmentRepository;
        this.professionalRepository = professionalRepository;
        this.offerRepository = offerRepository;
        this.availabilityRepository = availabilityRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.transactionRunner = transactionRunner;
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

        // Règle 4 : le rendez-vous tient dans les disponibilités du professionnel,
        // et son début correspond à un créneau réellement proposé (grille de 15 minutes)
        const schedule = await this.checkSchedule(input.professionalId, start, end);
        if (schedule === "OUTSIDE_HOURS") {
            throw new ConflictError("Ce créneau est en dehors des horaires du professionnel");
        }
        if (schedule === "OFF_GRID") {
            throw new ValidationError(
                "Le début du rendez-vous doit correspondre à un créneau proposé (toutes les " +
                SLOT_STEP_MINUTES +
                " minutes à partir de l'ouverture)",
                []
            );
        }

        // Règle 5 : pas d'indisponibilité sur la période
        const absences = await this.unavailabilityRepository.findOverlapping(input.professionalId, start, end);
        if (absences.length > 0) {
            throw new ConflictError("Le professionnel est indisponible à cette période");
        }

        let notes: string | null = null;
        if (input.notes !== undefined && input.notes !== null) {
            notes = input.notes;
        }

        // Règle 6 : pas d'autre rendez-vous (non annulé) sur la période.
        // Le contrôle et l'insertion sont dans UNE transaction, avec un verrou sur le professionnel :
        // si deux clients réservent le même créneau en même temps, le second attend le premier,
        // puis voit son rendez-vous et reçoit "déjà réservé".
        const row = await this.transactionRunner.run(async (db) => {
            // Le verrou doit être la PREMIÈRE requête de la transaction
            const isLocked = await this.professionalRepository.lockById(input.professionalId, db);
            if (isLocked === false) {
                throw new NotFoundError("Professionnel introuvable");
            }

            // On libère d'abord les réservations non payées dont le délai est passé : leur créneau redevient libre
            await this.releaseExpiredUnpaid(input.professionalId, db);

            const others = await this.appointmentRepository.findOverlapping(input.professionalId, start, end, db);
            if (others.length > 0) {
                throw new ConflictError("Ce créneau est déjà réservé");
            }

            return this.appointmentRepository.create(
                {
                    clientId: clientId,
                    professionalId: input.professionalId,
                    serviceId: input.serviceId,
                    startDatetime: start,
                    endDatetime: end,
                    priceAtBooking: price,
                    notes: notes,
                },
                db
            );
        });
        return this.toItem(row);
    }

    // Libère les réservations non payées dont le délai est passé (pour un professionnel, ou pour tous).
    // Renvoie le nombre de rendez-vous libérés.
    async releaseExpiredUnpaid(professionalId?: number, db?: DbClient): Promise<number> {
        const now = new Date();
        const createdBefore = new Date(now.getTime() - UNPAID_HOLD_MINUTES * 60 * 1000);
        return this.appointmentRepository.cancelExpiredUnpaid(now, createdBefore, UNPAID_CANCEL_REASON, professionalId, db);
    }

    // Un professionnel ajoute un rendez-vous à la main pour un client sans compte (un invité).
    // Il peut le placer hors de ses horaires, pendant une absence ou dans le passé :
    // les seules règles qui restent sont le service proposé, la minute pile et le chevauchement.
    async createManual(professionalId: number, input: CreateManualAppointmentInput): Promise<AppointmentDetail> {
        // Règle 1 : le professionnel existe encore
        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional) {
            throw new NotFoundError("Professionnel introuvable");
        }

        // Règle 2 : il propose ce service
        const offer = await this.offerRepository.findOne(professionalId, input.serviceId);
        if (!offer) {
            throw new NotFoundError("Ce service n'est pas proposé par ce professionnel");
        }

        // Règle 3 : le début est à une minute pile (pas de règle sur le futur : le passé est permis)
        const start = new Date(input.startDatetime);
        if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) {
            throw new ValidationError("Le rendez-vous doit commencer à une minute pile (secondes à 00)", []);
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

        const end = new Date(start.getTime() + duration * 60 * 1000);

        let guestPhone: string | null = null;
        if (input.guestPhone !== undefined && input.guestPhone !== null) {
            guestPhone = input.guestPhone;
        }

        let notes: string | null = null;
        if (input.notes !== undefined && input.notes !== null) {
            notes = input.notes;
        }

        // Règle 4 : pas d'autre rendez-vous (non annulé) sur la période.
        // Même principe que pour la réservation d'un client : verrou, contrôle et insertion dans UNE transaction.
        const row = await this.transactionRunner.run(async (db) => {
            // Le verrou doit être la PREMIÈRE requête de la transaction
            const isLocked = await this.professionalRepository.lockById(professionalId, db);
            if (isLocked === false) {
                throw new NotFoundError("Professionnel introuvable");
            }

            const others = await this.appointmentRepository.findOverlapping(professionalId, start, end, db);
            if (others.length > 0) {
                throw new ConflictError("Ce créneau est déjà réservé");
            }

            // C'est le professionnel qui a décidé : le rendez-vous est confirmé tout de suite
            return this.appointmentRepository.createManual(
                {
                    professionalId: professionalId,
                    serviceId: input.serviceId,
                    startDatetime: start,
                    endDatetime: end,
                    priceAtBooking: price,
                    status: "CONFIRMED",
                    guestName: input.guestName,
                    guestPhone: guestPhone,
                    notes: notes,
                },
                db
            );
        });
        return this.toDetail(row);
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

        // On prévient l'autre personne par email (une panne d'email ne fait pas échouer l'annulation)
        if (this.notifier !== null) {
            await this.notifier.notifyCancelled(appointmentId, role === "CLIENT" ? "CLIENT" : "PROFESSIONAL");
        }

        return this.toDetail(updated);
    }

    // Le professionnel clôture un rendez-vous : terminé (COMPLETED) ou client absent (NO_SHOW).
    // Règles : c'est son rendez-vous, il est CONFIRMED (donc payé ou ajouté à la main) et son heure de début est passée.
    async markOutcome(professionalId: number, appointmentId: number, outcome: "COMPLETED" | "NO_SHOW"): Promise<AppointmentDetail> {
        const row = await this.appointmentRepository.findById(appointmentId);
        // Rendez-vous d'un autre professionnel : on répond "introuvable" (comme pour l'annulation)
        if (!row || row.professionalId !== professionalId) {
            throw new NotFoundError("Rendez-vous introuvable");
        }

        if (row.status === "PENDING") {
            throw new ConflictError("Ce rendez-vous n'est pas encore confirmé (paiement en attente)");
        }
        if (row.status !== "CONFIRMED") {
            throw new ConflictError("Ce rendez-vous est déjà clôturé ou annulé");
        }
        if (row.startDatetime.getTime() > Date.now()) {
            throw new ConflictError("Ce rendez-vous n'a pas encore commencé");
        }

        // Changement atomique : si le statut a changé entre-temps (annulation simultanée), on refuse
        const changed = await this.appointmentRepository.setStatusIfCurrent(appointmentId, "CONFIRMED", outcome);
        if (changed === 0) {
            throw new ConflictError("Le statut de ce rendez-vous vient de changer");
        }

        const updated = await this.appointmentRepository.findById(appointmentId);
        if (!updated) {
            throw new NotFoundError("Rendez-vous introuvable");
        }
        return this.toDetail(updated);
    }

    // Une personne est concernée par un rendez-vous si elle en est le client ou le professionnel.
    // Un rendez-vous d'invité n'a pas de clientId : seul son professionnel en fait partie.
    private isParticipant(row: AppointmentDetailRow, userId: number, role: Role): boolean {
        if (role === "CLIENT" && row.clientId === userId) {
            return true;
        }
        if (role === "PROFESSIONAL" && row.professionalId === userId) {
            return true;
        }
        return false;
    }

    // Vérifie les horaires du professionnel pour ce rendez-vous (heure locale) :
    // - "OUTSIDE_HOURS" : le rendez-vous n'est pas entièrement couvert par ses disponibilités
    // - "OFF_GRID" : il est couvert, mais son début ne tombe pas sur un créneau proposé
    // - "OK" : tout est bon
    private async checkSchedule(professionalId: number, start: Date, end: Date): Promise<ScheduleCheck> {
        const startLocal = toLocalMoment(start);
        const endLocal = toLocalMoment(end);

        // Un rendez-vous qui passe minuit ne peut pas tenir dans une disponibilité
        if (endLocal.dateText !== startLocal.dateText) {
            return "OUTSIDE_HOURS";
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

        if (current < endLocal.minutes) {
            return "OUTSIDE_HOURS";
        }

        // Même calcul que SlotService : les créneaux partent du début de la plage fusionnée
        const mergedBlocks = mergeTimeBlocks(validBlocks);
        if (isOnSlotGrid(mergedBlocks, startLocal.minutes) === false) {
            return "OFF_GRID";
        }

        return "OK";
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

        // Un client avec compte : "client" est rempli, "guest" vaut null
        let client: AppointmentDetail["client"] = null;
        if (row.client !== null && row.clientId !== null) {
            client = {
                userId: row.clientId,
                firstName: row.client.user.firstName,
                lastName: row.client.user.lastName,
                phoneNumber: row.client.user.phoneNumber,
            };
        }

        // Un invité (pas de compte) : "client" vaut null, "guest" est rempli
        let guest: AppointmentDetail["guest"] = null;
        if (client === null && row.guestName !== null) {
            guest = { name: row.guestName, phoneNumber: row.guestPhone };
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
            client: client,
            guest: guest,
        };
    }
}