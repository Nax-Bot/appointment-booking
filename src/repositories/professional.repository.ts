import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Données modifiables du profil (undefined = ne pas toucher, null = effacer)
export interface UpdateProfileData {
    description?: string | null;
    specialty?: string | null;
}

export class ProfessionalRepository {
    // Tous les professionnels, triés par nom de famille (sans email ni mot de passe)
    async findAll(db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professional.findMany({
            select: {
                userId: true,
                description: true,
                specialty: true,
                user: { select: { firstName: true, lastName: true } },
            },
            orderBy: { user: { lastName: "asc" } },
        });
    }

    // Les professionnels qui proposent un service, avec leur offre (prix et durée personnalisés),
    // triés par nom de famille (sans email ni mot de passe)
    async findByService(serviceId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professionalService.findMany({
            where: { serviceId: serviceId },
            select: {
                customPrice: true,
                customDuration: true,
                service: { select: { id: true, name: true, price: true, duration: true } },
                professional: {
                    select: {
                        userId: true,
                        description: true,
                        specialty: true,
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { professional: { user: { lastName: "asc" } } },
        });
    }

    // Un professionnel par son identifiant (null s'il n'existe pas)
    async findById(userId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professional.findUnique({
            where: { userId: userId },
            select: {
                userId: true,
                description: true,
                specialty: true,
                user: { select: { firstName: true, lastName: true } },
            },
        });
    }

    // Modifie le profil d'un professionnel
    async updateProfile(userId: number, data: UpdateProfileData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professional.update({
            where: { userId: userId },
            data: {
                description: data.description,
                specialty: data.specialty,
            },
            select: {
                userId: true,
                description: true,
                specialty: true,
                user: { select: { firstName: true, lastName: true } },
            },
        });
    }
}