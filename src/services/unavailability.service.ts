import { UnavailabilityRepository, UnavailabilityData } from "@/repositories/unavailability.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

// Données reçues (dates ISO 8601 avec fuseau)
export interface UnavailabilityInput {
    startDatetime: string;
    endDatetime: string;
    reason?: string | null;
}

// Ce que l'on renvoie (dates en UTC, au format ISO)
export interface UnavailabilityItem {
    id: number;
    startDatetime: string;
    endDatetime: string;
    reason: string | null;
}

// Forme d'une indisponibilité telle que le repository la renvoie
interface UnavailabilityRow {
    id: number;
    startDatetime: Date;
    endDatetime: Date;
    reason: string | null;
}

export class UnavailabilityService {
    private unavailabilityRepository: UnavailabilityRepository;
    private professionalRepository: ProfessionalRepository;

    constructor(
        unavailabilityRepository: UnavailabilityRepository,
        professionalRepository: ProfessionalRepository
    ) {
        this.unavailabilityRepository = unavailabilityRepository;
        this.professionalRepository = professionalRepository;
    }

    // Liste les indisponibilités d'un professionnel
    async listByProfessional(professionalId: number): Promise<UnavailabilityItem[]> {
        await this.checkProfessionalExists(professionalId);

        const rows = await this.unavailabilityRepository.findByProfessional(professionalId);

        const result: UnavailabilityItem[] = [];
        for (const row of rows) {
            result.push(this.toItem(row));
        }
        return result;
    }

    // Crée une indisponibilité
    async create(professionalId: number, input: UnavailabilityInput): Promise<UnavailabilityItem> {
        await this.checkProfessionalExists(professionalId);

        const data = await this.prepareData(professionalId, input, null);
        const row = await this.unavailabilityRepository.create(professionalId, data);
        return this.toItem(row);
    }

    // Remplace une indisponibilité (seulement si elle appartient au professionnel)
    async update(professionalId: number, unavailabilityId: number, input: UnavailabilityInput): Promise<UnavailabilityItem> {
        const existing = await this.unavailabilityRepository.findOwned(unavailabilityId, professionalId);
        if (!existing) {
            throw new NotFoundError("Indisponibilité introuvable");
        }

        // On ignore l'indisponibilité elle-même dans le contrôle des chevauchements
        const data = await this.prepareData(professionalId, input, unavailabilityId);
        const row = await this.unavailabilityRepository.update(unavailabilityId, data);
        return this.toItem(row);
    }

    // Supprime une indisponibilité (seulement si elle appartient au professionnel)
    async remove(professionalId: number, unavailabilityId: number) {
        const existing = await this.unavailabilityRepository.findOwned(unavailabilityId, professionalId);
        if (!existing) {
            throw new NotFoundError("Indisponibilité introuvable");
        }

        await this.unavailabilityRepository.delete(unavailabilityId);
        return { message: "Indisponibilité supprimée" };
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
        input: UnavailabilityInput,
        ignoreId: number | null
    ): Promise<UnavailabilityData> {
        // Le fuseau horaire de la date reçue est pris en compte : on obtient un instant exact
        const start = new Date(input.startDatetime);
        const end = new Date(input.endDatetime);

        // Règle 1 : la fin est après le début
        if (end.getTime() <= start.getTime()) {
            throw new ValidationError("La date de fin doit être après la date de début", []);
        }

        // Règle 2 : pas de chevauchement avec une autre indisponibilité
        const overlapping = await this.unavailabilityRepository.findOverlapping(professionalId, start, end);
        for (const other of overlapping) {
            let isItself = false;
            if (ignoreId !== null && other.id === ignoreId) {
                isItself = true;
            }

            if (isItself === false) {
                throw new ConflictError("Cette période chevauche une autre indisponibilité");
            }
        }

        // Raison absente ou null = pas de raison
        let reason: string | null = null;
        if (input.reason !== undefined && input.reason !== null) {
            reason = input.reason;
        }

        return {
            startDatetime: start,
            endDatetime: end,
            reason: reason,
        };
    }

    // Transforme une ligne de la base en réponse simple (dates en UTC)
    private toItem(row: UnavailabilityRow): UnavailabilityItem {
        return {
            id: row.id,
            startDatetime: row.startDatetime.toISOString(),
            endDatetime: row.endDatetime.toISOString(),
            reason: row.reason,
        };
    }
}