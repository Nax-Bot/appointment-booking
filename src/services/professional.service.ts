import { ProfessionalRepository, UpdateProfileData } from "@/repositories/professional.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Ce que l'on renvoie d'un professionnel (à plat, sans données privées)
export interface ProfessionalPublic {
    userId: number;
    firstName: string;
    lastName: string;
    specialty: string | null;
    description: string | null;
}

// Forme d'un professionnel tel que le repository le renvoie
interface ProfessionalRow {
    userId: number;
    description: string | null;
    specialty: string | null;
    user: { firstName: string; lastName: string };
}

export class ProfessionalService {
    private professionalRepository: ProfessionalRepository;

    constructor(professionalRepository: ProfessionalRepository) {
        this.professionalRepository = professionalRepository;
    }

    // Liste de tous les professionnels
    async listAll(): Promise<ProfessionalPublic[]> {
        const rows = await this.professionalRepository.findAll();

        const result: ProfessionalPublic[] = [];
        for (const row of rows) {
            result.push(this.toPublic(row));
        }
        return result;
    }

    // Un professionnel, ou une erreur 404 s'il n'existe pas
    async getById(userId: number): Promise<ProfessionalPublic> {
        const row = await this.professionalRepository.findById(userId);

        if (!row) {
            throw new NotFoundError("Professionnel introuvable");
        }

        return this.toPublic(row);
    }

    // Modifie le profil du professionnel connecté
    async updateMyProfile(userId: number, data: UpdateProfileData): Promise<ProfessionalPublic> {
        // Règle métier : il faut envoyer au moins un champ à modifier
        if (data.description === undefined && data.specialty === undefined) {
            throw new ValidationError("Aucune donnée à modifier", []);
        }

        // Le compte peut avoir été supprimé alors que la session existe encore
        const existing = await this.professionalRepository.findById(userId);
        if (!existing) {
            throw new NotFoundError("Professionnel introuvable");
        }

        const updated = await this.professionalRepository.updateProfile(userId, data);
        return this.toPublic(updated);
    }

    // Met le professionnel à plat : nom et prénom au même niveau que le reste
    private toPublic(row: ProfessionalRow): ProfessionalPublic {
        return {
            userId: row.userId,
            firstName: row.user.firstName,
            lastName: row.user.lastName,
            specialty: row.specialty,
            description: row.description,
        };
    }
}