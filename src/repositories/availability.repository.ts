import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Données d'une disponibilité, prêtes pour la base
export interface AvailabilityData {
    dayOfWeek: number;
    startTime: Date;
    endTime: Date;
    validFrom: Date | null;
    validTo: Date | null;
}

export class AvailabilityRepository {
    // Toutes les disponibilités d'un professionnel, triées par jour puis par heure de début
    async findByProfessional(professionalId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.availability.findMany({
            where: { professionalId: professionalId },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        });
    }

    // Les disponibilités d'un professionnel pour un jour de la semaine (sert au contrôle des chevauchements)
    async findByProfessionalAndDay(professionalId: number, dayOfWeek: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.availability.findMany({
            where: { professionalId: professionalId, dayOfWeek: dayOfWeek },
        });
    }

    // Une disponibilité, seulement si elle appartient à ce professionnel (sinon null)
    async findOwned(id: number, professionalId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.availability.findFirst({
            where: { id: id, professionalId: professionalId },
        });
    }

    // Crée une disponibilité
    async create(professionalId: number, data: AvailabilityData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.availability.create({
            data: {
                professionalId: professionalId,
                dayOfWeek: data.dayOfWeek,
                startTime: data.startTime,
                endTime: data.endTime,
                validFrom: data.validFrom,
                validTo: data.validTo,
            },
        });
    }

    // Remplace les valeurs d'une disponibilité
    async update(id: number, data: AvailabilityData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.availability.update({
            where: { id: id },
            data: {
                dayOfWeek: data.dayOfWeek,
                startTime: data.startTime,
                endTime: data.endTime,
                validFrom: data.validFrom,
                validTo: data.validTo,
            },
        });
    }

    // Supprime une disponibilité
    async delete(id: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.availability.delete({ where: { id: id } });
    }
}