import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export class PaymentAccountRepository {
    // La boutique ACTIVE d'un professionnel (null s'il n'en a pas)
    async findActiveByProfessional(professionalId: number, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.paymentAccount.findFirst({
            where: { professionalId: professionalId, status: "ACTIVE" },
            orderBy: { id: "desc" },
        });
    }

    // Une boutique par son identifiant (active ou retirée : une notification tardive doit rester vérifiable)
    async findById(id: number, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.paymentAccount.findUnique({ where: { id: id } });
    }

    // Passe toutes les boutiques ACTIVE du professionnel à RETIRED
    async retireActive(professionalId: number, when: Date, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.paymentAccount.updateMany({
            where: { professionalId: professionalId, status: "ACTIVE" },
            data: { status: "RETIRED", retiredAt: when },
        });
    }

    async create(
        data: { professionalId: number; boutiqueCode: string; apiKeyEnc: string; webhookSecretEnc: string },
        db?: Prisma.TransactionClient
    ) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.paymentAccount.create({ data: data });
    }
}
