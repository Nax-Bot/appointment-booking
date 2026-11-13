import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export class EmailVerificationRepository {
    // Le code en cours d'un utilisateur (null s'il n'en a pas)
    async findByUserId(userId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.emailVerification.findUnique({ where: { userId: userId } });
    }

    // Crée le code, ou remplace l'ancien : le nombre d'essais repart à zéro
    async upsert(userId: number, codeHash: string, expiresAt: Date, sentAt: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.emailVerification.upsert({
            where: { userId: userId },
            update: { codeHash: codeHash, expiresAt: expiresAt, attempts: 0, lastSentAt: sentAt },
            create: { userId: userId, codeHash: codeHash, expiresAt: expiresAt, lastSentAt: sentAt },
        });
    }

    // Compte un essai raté
    async incrementAttempts(userId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.emailVerification.update({
            where: { userId: userId },
            data: { attempts: { increment: 1 } },
        });
    }
}