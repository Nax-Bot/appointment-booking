import { AvailabilityRepository, AvailabilityData } from "@/repositories/availability.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

// Données reçues (heures en "HH:mm", dates en "AAAA-MM-JJ")
export interface AvailabilityInput {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    validFrom?: string | null;
    validTo?: string | null;
}

// Ce que l'on renvoie
export interface AvailabilityItem {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    validFrom: string | null;
    validTo: string | null;
}

// Forme d'une disponibilité telle que le repository la renvoie
interface AvailabilityRow {
    id: number;
    dayOfWeek: number;
    startTime: Date;
    endTime: Date;
    validFrom: Date | null;
    validTo: Date | null;
}

export class AvailabilityService {
    private availabilityRepository: AvailabilityRepository;
    private professionalRepository: ProfessionalRepository;

    constructor(
        availabilityRepository: AvailabilityRepository,
        professionalRepository: ProfessionalRepository
    ) {
        this.availabilityRepository = availabilityRepository;
        this.professionalRepository = professionalRepository;
    }

    // Liste les disponibilités d'un professionnel
    async listByProfessional(professionalId: number): Promise<AvailabilityItem[]> {
        await this.checkProfessionalExists(professionalId);

        const rows = await this.availabilityRepository.findByProfessional(professionalId);

        const result: AvailabilityItem[] = [];
        for (const row of rows) {
            result.push(this.toItem(row));
        }
        return result;
    }

    // Crée une disponibilité
    async create(professionalId: number, input: AvailabilityInput): Promise<AvailabilityItem> {
        await this.checkProfessionalExists(professionalId);

        const data = await this.prepareData(professionalId, input, null);
        const row = await this.availabilityRepository.create(professionalId, data);
        return this.toItem(row);
    }

    // Remplace une disponibilité (seulement si elle appartient au professionnel)
    async update(professionalId: number, availabilityId: number, input: AvailabilityInput): Promise<AvailabilityItem> {
        const existing = await this.availabilityRepository.findOwned(availabilityId, professionalId);
        if (!existing) {
            throw new NotFoundError("Disponibilité introuvable");
        }

        // On ignore la disponibilité elle-même dans le contrôle des chevauchements
        const data = await this.prepareData(professionalId, input, availabilityId);
        const row = await this.availabilityRepository.update(availabilityId, data);
        return this.toItem(row);
    }

    // Supprime une disponibilité (seulement si elle appartient au professionnel)
    async remove(professionalId: number, availabilityId: number) {
        const existing = await this.availabilityRepository.findOwned(availabilityId, professionalId);
        if (!existing) {
            throw new NotFoundError("Disponibilité introuvable");
        }

        await this.availabilityRepository.delete(availabilityId);
        return { message: "Disponibilité supprimée" };
    }

    // Le compte professionnel peut avoir été supprimé alors que la session existe encore
    private async checkProfessionalExists(professionalId: number) {
        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional) {
            throw new NotFoundError("Professionnel introuvable");
        }
    }

    // Vérifie les règles métier et prépare les données pour la base
    private async prepareData(
        professionalId: number,
        input: AvailabilityInput,
        ignoreId: number | null
    ): Promise<AvailabilityData> {
        // Règle 1 : la fin est après le début ("HH:mm" se compare comme du texte)
        if (input.endTime <= input.startTime) {
            throw new ValidationError("L'heure de fin doit être après l'heure de début", []);
        }

        // Règle 2 : les dates de validité existent, et la fin n'est pas avant le début
        let validFromText: string | null = null;
        let validFrom: Date | null = null;
        if (input.validFrom !== undefined && input.validFrom !== null) {
            validFrom = this.parseDateOnly(input.validFrom, "validFrom");
            validFromText = input.validFrom;
        }

        let validToText: string | null = null;
        let validTo: Date | null = null;
        if (input.validTo !== undefined && input.validTo !== null) {
            validTo = this.parseDateOnly(input.validTo, "validTo");
            validToText = input.validTo;
        }

        if (validFromText !== null && validToText !== null) {
            if (validToText < validFromText) {
                throw new ValidationError("La fin de validité ne peut pas être avant le début de validité", []);
            }
        }

        // Règle 3 : pas de chevauchement avec une autre disponibilité
        await this.checkNoOverlap(professionalId, input, validFromText, validToText, ignoreId);

        return {
            dayOfWeek: input.dayOfWeek,
            startTime: this.textToTime(input.startTime),
            endTime: this.textToTime(input.endTime),
            validFrom: validFrom,
            validTo: validTo,
        };
    }

    // Refuse une plage qui chevauche une autre plage du même jour sur une période commune
    private async checkNoOverlap(
        professionalId: number,
        input: AvailabilityInput,
        validFromText: string | null,
        validToText: string | null,
        ignoreId: number | null
    ) {
        const sameDay = await this.availabilityRepository.findByProfessionalAndDay(professionalId, input.dayOfWeek);

        for (const other of sameDay) {
            let isItself = false;
            if (ignoreId !== null && other.id === ignoreId) {
                isItself = true;
            }

            if (isItself === false) {
                const otherStart = this.timeToText(other.startTime);
                const otherEnd = this.timeToText(other.endTime);

                // Deux plages se chevauchent si chacune commence avant la fin de l'autre
                const timesOverlap = input.startTime < otherEnd && input.endTime > otherStart;

                if (timesOverlap) {
                    let otherFrom: string | null = null;
                    if (other.validFrom !== null) {
                        otherFrom = this.dateToText(other.validFrom);
                    }
                    let otherTo: string | null = null;
                    if (other.validTo !== null) {
                        otherTo = this.dateToText(other.validTo);
                    }

                    if (this.periodsOverlap(validFromText, validToText, otherFrom, otherTo)) {
                        throw new ConflictError("Cette plage horaire chevauche une autre disponibilité");
                    }
                }
            }
        }
    }

    // Deux périodes se recoupent, sauf si l'une commence après la fin de l'autre (null = sans limite)
    private periodsOverlap(
        fromA: string | null,
        toA: string | null,
        fromB: string | null,
        toB: string | null
    ): boolean {
        if (fromA !== null && toB !== null && fromA > toB) {
            return false;
        }
        if (fromB !== null && toA !== null && fromB > toA) {
            return false;
        }
        return true;
    }

    // Transforme "AAAA-MM-JJ" en Date, et refuse les dates qui n'existent pas (ex. 2026-02-31)
    private parseDateOnly(text: string, fieldName: string): Date {
        const date = new Date(text + "T00:00:00.000Z");

        if (Number.isNaN(date.getTime()) || date.toISOString().substring(0, 10) !== text) {
            throw new ValidationError("Données invalides", [fieldName + " : cette date n'existe pas"]);
        }

        return date;
    }

    // "08:00" devient une Date du 1er janvier 1970 à 08:00 (c'est ce que Prisma attend pour une colonne Time)
    private textToTime(text: string): Date {
        return new Date("1970-01-01T" + text + ":00.000Z");
    }

    // Inverse : Date -> "08:00"
    private timeToText(date: Date): string {
        return date.toISOString().substring(11, 16);
    }

    // Date -> "AAAA-MM-JJ"
    private dateToText(date: Date): string {
        return date.toISOString().substring(0, 10);
    }

    // Transforme une ligne de la base en réponse simple
    private toItem(row: AvailabilityRow): AvailabilityItem {
        let validFrom: string | null = null;
        if (row.validFrom !== null) {
            validFrom = this.dateToText(row.validFrom);
        }

        let validTo: string | null = null;
        if (row.validTo !== null) {
            validTo = this.dateToText(row.validTo);
        }

        return {
            id: row.id,
            dayOfWeek: row.dayOfWeek,
            startTime: this.timeToText(row.startTime),
            endTime: this.timeToText(row.endTime),
            validFrom: validFrom,
            validTo: validTo,
        };
    }
}