import { prisma } from "@/lib/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";

export class PasswordResetRepository {
    // Le code de réinitialisation en cours d'un utilisateur (null s'il n'en a pas)
    async findByUserId(userId: number, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.passwordReset.findUnique({ where: { userId: userId } });
    }

    // Crée le code, ou remplace l'ancien : le nombre d'essais repart à zéro
    async upsert(userId: number, codeHash: string, expiresAt: Date, sentAt: Date, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.passwordReset.upsert({
            where: { userId: userId },
            update: { codeHash: codeHash, expiresAt: expiresAt, attempts: 0, lastSentAt: sentAt },
            create: { userId: userId, codeHash: codeHash, expiresAt: expiresAt, lastSentAt: sentAt },
        });
    }

    // Compte un essai raté
    async incrementAttempts(userId: number, db?: Prisma.TransactionClient) {
        const client: Prisma.TransactionClient = db ?? prisma;
        return client.passwordReset.update({
            where: { userId: userId },
            data: { attempts: { increment: 1 } },
        });
    }
}
