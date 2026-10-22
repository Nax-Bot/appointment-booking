import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Les statuts possibles d'un rendez-vous (comme dans le schéma Prisma)
export type AppointmentStatusValue = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

// Données d'un nouveau rendez-vous, prêtes pour la base
export interface NewAppointmentData {
    clientId: number;
    professionalId: number;
    serviceId: number;
    startDatetime: Date;
    endDatetime: Date;
    priceAtBooking: number;
    notes: string | null;
}

export class AppointmentRepository {
    // Les rendez-vous non annulés d'un professionnel qui chevauchent la période donnée
    // (deux périodes qui se touchent ne se chevauchent pas)
    async findOverlapping(professionalId: number, start: Date, end: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.appointment.findMany({
            where: {
                professionalId: professionalId,
                status: { not: "CANCELLED" },
                startDatetime: { lt: end },
                endDatetime: { gt: start },
            },
        });
    }

    // Crée un rendez-vous (le statut vaut PENDING par défaut)
    async create(data: NewAppointmentData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.appointment.create({
            data: {
                clientId: data.clientId,
                professionalId: data.professionalId,
                serviceId: data.serviceId,
                startDatetime: data.startDatetime,
                endDatetime: data.endDatetime,
                priceAtBooking: data.priceAtBooking,
                notes: data.notes,
            },
        });
    }

    // Les rendez-vous d'un client, du plus ancien au plus récent (filtre de statut facultatif)
    async findForClient(clientId: number, status?: AppointmentStatusValue, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.appointment.findMany({
            where: { clientId: clientId, status: status },
            include: {
                service: { select: { id: true, name: true } },
                client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
                professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { startDatetime: "asc" },
        });
    }

    // Les rendez-vous d'un professionnel, du plus ancien au plus récent (filtre de statut facultatif)
    async findForProfessional(professionalId: number, status?: AppointmentStatusValue, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.appointment.findMany({
            where: { professionalId: professionalId, status: status },
            include: {
                service: { select: { id: true, name: true } },
                client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
                professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { startDatetime: "asc" },
        });
    }

    // Un rendez-vous avec son service, son client et son professionnel (null s'il n'existe pas)
    async findById(id: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.appointment.findUnique({
            where: { id: id },
            include: {
                service: { select: { id: true, name: true } },
                client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
                professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }

    // Passe un rendez-vous au statut CANCELLED, avec la date et la raison de l'annulation
    async cancel(id: number, cancelledAt: Date, reason: string | null, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.appointment.update({
            where: { id: id },
            data: {
                status: "CANCELLED",
                cancelledAt: cancelledAt,
                cancellationReason: reason,
            },
            include: {
                service: { select: { id: true, name: true } },
                client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
                professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }
}