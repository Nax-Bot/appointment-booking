import { ProfessionalRepository } from "@/repositories/professional.repository";
import { OfferRepository } from "@/repositories/offer.repository";
import { AvailabilityRepository } from "@/repositories/availability.repository";
import { UnavailabilityRepository } from "@/repositories/unavailability.repository";
import { AppointmentRepository } from "@/repositories/appointment.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
    isRealDateText,
    dayOfWeekOfDateText,
    localMidnightToUtc,
    minutesToText,
    timeColumnToMinutes,
    dateColumnToText,
} from "@/lib/datetime";

// On propose un créneau toutes les 15 minutes
const SLOT_STEP_MINUTES = 15;

// Un créneau libre : instants en UTC pour réserver, heures locales pour l'affichage
export interface SlotItem {
    startDatetime: string;
    endDatetime: string;
    startTime: string;
    endTime: string;
}

// La réponse complète
export interface SlotsResult {
    professionalId: number;
    serviceId: number;
    date: string;
    duration: number;
    price: number;
    slots: SlotItem[];
}

// Une plage de travail, en minutes depuis minuit (heure locale)
interface TimeBlock {
    start: number;
    end: number;
}

// Une période déjà occupée (absence ou rendez-vous), en millisecondes UTC
interface BusyPeriod {
    start: number;
    end: number;
}

export class SlotService {
    private professionalRepository: ProfessionalRepository;
    private offerRepository: OfferRepository;
    private availabilityRepository: AvailabilityRepository;
    private unavailabilityRepository: UnavailabilityRepository;
    private appointmentRepository: AppointmentRepository;

    constructor(
        professionalRepository: ProfessionalRepository,
        offerRepository: OfferRepository,
        availabilityRepository: AvailabilityRepository,
        unavailabilityRepository: UnavailabilityRepository,
        appointmentRepository: AppointmentRepository
    ) {
        this.professionalRepository = professionalRepository;
        this.offerRepository = offerRepository;
        this.availabilityRepository = availabilityRepository;
        this.unavailabilityRepository = unavailabilityRepository;
        this.appointmentRepository = appointmentRepository;
    }

    // Calcule les créneaux libres d'un professionnel pour un service et une date locale
    async getSlots(professionalId: number, serviceId: number, dateText: string): Promise<SlotsResult> {
        // La date doit exister (le format a déjà été vérifié par zod)
        if (isRealDateText(dateText) === false) {
            throw new ValidationError("Données invalides", ["date : cette date n'existe pas"]);
        }

        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional) {
            throw new NotFoundError("Professionnel introuvable");
        }

        const offer = await this.offerRepository.findOne(professionalId, serviceId);
        if (!offer) {
            throw new NotFoundError("Ce service n'est pas proposé par ce professionnel");
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

        const result: SlotsResult = {
            professionalId: professionalId,
            serviceId: serviceId,
            date: dateText,
            duration: duration,
            price: price,
            slots: [],
        };

        // Les plages de travail du jour : s'il n'y en a pas, il n'y a aucun créneau
        const workingBlocks = await this.getWorkingBlocks(professionalId, dateText);
        if (workingBlocks.length === 0) {
            return result;
        }

        // Les périodes déjà occupées ce jour-là (absences et rendez-vous non annulés)
        const dayStart = localMidnightToUtc(dateText);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const busyPeriods = await this.getBusyPeriods(professionalId, dayStart, dayEnd);

        const now = Date.now();

        for (const block of workingBlocks) {
            let minute = block.start;

            // On avance de 15 minutes en 15 minutes tant que le service tient dans la plage
            while (minute + duration <= block.end) {
                const startMs = dayStart.getTime() + minute * 60 * 1000;
                const endMs = startMs + duration * 60 * 1000;

                // On garde le créneau s'il est dans le futur et libre
                if (startMs > now && this.isFree(startMs, endMs, busyPeriods)) {
                    result.slots.push({
                        startDatetime: new Date(startMs).toISOString(),
                        endDatetime: new Date(endMs).toISOString(),
                        startTime: minutesToText(minute),
                        endTime: minutesToText(minute + duration),
                    });
                }

                minute = minute + SLOT_STEP_MINUTES;
            }
        }

        return result;
    }

    // Les plages de travail du jour, valables à cette date, avec les plages qui se touchent fusionnées
    private async getWorkingBlocks(professionalId: number, dateText: string): Promise<TimeBlock[]> {
        const dayOfWeek = dayOfWeekOfDateText(dateText);
        const rows = await this.availabilityRepository.findByProfessionalAndDay(professionalId, dayOfWeek);

        // On garde les plages valables à cette date (validFrom et validTo sont facultatifs)
        const validBlocks: TimeBlock[] = [];
        for (const row of rows) {
            let isValid = true;

            if (row.validFrom !== null && dateColumnToText(row.validFrom) > dateText) {
                isValid = false;
            }
            if (row.validTo !== null && dateColumnToText(row.validTo) < dateText) {
                isValid = false;
            }

            if (isValid) {
                validBlocks.push({
                    start: timeColumnToMinutes(row.startTime),
                    end: timeColumnToMinutes(row.endTime),
                });
            }
        }

        // On trie par heure de début, puis on fusionne celles qui se touchent ou se chevauchent
        validBlocks.sort(function (a, b) {
            return a.start - b.start;
        });

        const merged: TimeBlock[] = [];
        for (const block of validBlocks) {
            if (merged.length === 0) {
                merged.push({ start: block.start, end: block.end });
            } else {
                const last = merged[merged.length - 1];

                if (block.start <= last.end) {
                    if (block.end > last.end) {
                        last.end = block.end;
                    }
                } else {
                    merged.push({ start: block.start, end: block.end });
                }
            }
        }

        return merged;
    }

    // Les périodes occupées du jour : indisponibilités et rendez-vous non annulés
    private async getBusyPeriods(professionalId: number, dayStart: Date, dayEnd: Date): Promise<BusyPeriod[]> {
        const busyPeriods: BusyPeriod[] = [];

        const absences = await this.unavailabilityRepository.findOverlapping(professionalId, dayStart, dayEnd);
        for (const absence of absences) {
            busyPeriods.push({ start: absence.startDatetime.getTime(), end: absence.endDatetime.getTime() });
        }

        const appointments = await this.appointmentRepository.findOverlapping(professionalId, dayStart, dayEnd);
        for (const appointment of appointments) {
            busyPeriods.push({ start: appointment.startDatetime.getTime(), end: appointment.endDatetime.getTime() });
        }

        return busyPeriods;
    }

    // Un créneau est libre s'il ne chevauche aucune période occupée (deux périodes qui se touchent ne se chevauchent pas)
    private isFree(startMs: number, endMs: number, busyPeriods: BusyPeriod[]): boolean {
        for (const busy of busyPeriods) {
            if (startMs < busy.end && endMs > busy.start) {
                return false;
            }
        }
        return true;
    }
}