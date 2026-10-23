import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Données d'un nouveau service
export interface NewServiceData {
    name: string;
    description: string | null;
    duration: number;
    price: number;
}

export class ServiceRepository {
    // Tous les services, triés par nom
    async findAll(db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.service.findMany({ orderBy: { name: "asc" } });
    }

    // Un service par son identifiant (null s'il n'existe pas)
    async findById(id: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.service.findUnique({ where: { id: id } });
    }

    // Crée un service ET l'offre de son créateur en une seule opération (tout ou rien).
    // La durée et le prix du service servent aussi de durée et de prix personnalisés de l'offre.
    async createWithOffer(data: NewServiceData, professionalId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.service.create({
            data: {
                name: data.name,
                description: data.description,
                duration: data.duration,
                price: data.price,
                professionals: {
                    create: {
                        professionalId: professionalId,
                        customPrice: data.price,
                        customDuration: data.duration,
                    },
                },
            },
        });
    }
}