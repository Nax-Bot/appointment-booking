import { prisma } from "@/lib/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface NewPaymentData {
    appointmentId: number;
    paymentAccountId: number;
    amount: number;
    reference: string;
    notificationToken: string;
    paymentUrl: string;
    expiresAt: Date;
}

export class PaymentRepository {
    async create(data: NewPaymentData, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.payment.create({
            data: {
                appointmentId: data.appointmentId,
                paymentAccountId: data.paymentAccountId,
                amount: data.amount,
                currency: "MGA",
                provider: "PAPI",
                paymentStatus: "PENDING",
                reference: data.reference,
                notificationToken: data.notificationToken,
                paymentUrl: data.paymentUrl,
                expiresAt: data.expiresAt,
            },
        });
    }

    async findByReference(reference: string, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.payment.findUnique({ where: { reference: reference } });
    }

    // Le dernier paiement en ligne d'un rendez-vous (le plus récent d'abord)
    async findLatestByAppointment(appointmentId: number, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.payment.findFirst({
            where: { appointmentId: appointmentId, provider: "PAPI" },
            orderBy: { id: "desc" },
        });
    }

    // Passe PENDING -> PAID. Renvoie le nombre de lignes modifiées : 0 = déjà traité (notification rejouée).
    async markPaidIfPending(
        id: number,
        data: { paymentDate: Date; externalReference: string | null; paymentMethod: "CARD" | "MOBILE_MONEY" | null; feeAmount: number | null },
        db?: Prisma.TransactionClient
    ) {
        const client: Prisma.TransactionClient = db ?? prisma;
        const result = await client.payment.updateMany({
            where: { id: id, paymentStatus: "PENDING" },
            data: {
                paymentStatus: "PAID",
                paymentDate: data.paymentDate,
                externalReference: data.externalReference,
                paymentMethod: data.paymentMethod,
                feeAmount: data.feeAmount,
            },
        });
        return result.count;
    }

    async markFailedIfPending(id: number, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        const result = await client.payment.updateMany({
            where: { id: id, paymentStatus: "PENDING" },
            data: { paymentStatus: "FAILED" },
        });
        return result.count;
    }
}
