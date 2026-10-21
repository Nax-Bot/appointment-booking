import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Données d'une indisponibilité, prêtes pour la base
export interface UnavailabilityData {
    startDatetime: Date;
    endDatetime: Date;
    reason: string | null;
}

export class UnavailabilityRepository {
    // Toutes les indisponibilités d'un professionnel, de la plus ancienne à la plus récente
    async findByProfessional(professionalId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.unavailability.findMany({
            where: { professionalId: professionalId },
            orderBy: { startDatetime: "asc" },
        });
    }

    // Les indisponibilités qui chevauchent la période donnée (deux périodes qui se touchent ne se chevauchent pas)
    async findOverlapping(professionalId: number, start: Date, end: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.unavailability.findMany({
            where: {
                professionalId: professionalId,
                startDatetime: { lt: end },
                endDatetime: { gt: start },
            },
        });
    }

    // Une indisponibilité, seulement si elle appartient à ce professionnel (sinon null)
    async findOwned(id: number, professionalId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.unavailability.findFirst({
            where: { id: id, professionalId: professionalId },
        });
    }

    // Crée une indisponibilité
    async create(professionalId: number, data: UnavailabilityData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.unavailability.create({
            data: {
                professionalId: professionalId,
                startDatetime: data.startDatetime,
                endDatetime: data.endDatetime,
                reason: data.reason,
            },
        });
    }

    // Remplace les valeurs d'une indisponibilité
    async update(id: number, data: UnavailabilityData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.unavailability.update({
            where: { id: id },
            data: {
                startDatetime: data.startDatetime,
                endDatetime: data.endDatetime,
                reason: data.reason,
            },
        });
    }

    // Supprime une indisponibilité
    async delete(id: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.unavailability.delete({ where: { id: id } });
    }
}