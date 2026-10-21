import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export class OfferRepository {
    // Tous les services proposés par un professionnel, triés par nom de service
    async findByProfessional(professionalId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professionalService.findMany({
            where: { professionalId: professionalId },
            include: { service: true },
            orderBy: { service: { name: "asc" } },
        });
    }

    // Une offre précise (null si le professionnel ne propose pas ce service)
    async findOne(professionalId: number, serviceId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professionalService.findUnique({
            where: { professionalId_serviceId: { professionalId: professionalId, serviceId: serviceId } },
            include: { service: true },
        });
    }

    // Crée l'offre si elle n'existe pas, sinon la met à jour
    async upsert(
        professionalId: number,
        serviceId: number,
        customPrice: number | null,
        customDuration: number | null,
        db?: Prisma.TransactionClient
    ) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professionalService.upsert({
            where: { professionalId_serviceId: { professionalId: professionalId, serviceId: serviceId } },
            update: { customPrice: customPrice, customDuration: customDuration },
            create: {
                professionalId: professionalId,
                serviceId: serviceId,
                customPrice: customPrice,
                customDuration: customDuration,
            },
            include: { service: true },
        });
    }

    // Retire un service de l'offre d'un professionnel
    async delete(professionalId: number, serviceId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.professionalService.delete({
            where: { professionalId_serviceId: { professionalId: professionalId, serviceId: serviceId } },
        });
    }
}