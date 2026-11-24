import { prisma } from "@/lib/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";

export class RateLimitRepository {
    // Le compteur d'une clé (null s'il n'y en a pas)
    async findByKey(limitKey: string, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.rateLimit.findUnique({ where: { limitKey: limitKey } });
    }

    // Ajoute un échec : crée le compteur à 1, ou ajoute 1 en une seule opération
    // (la base fait le calcul, donc des échecs simultanés sont tous comptés)
    async incrementFailures(limitKey: string, now: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.rateLimit.upsert({
            where: { limitKey: limitKey },
            create: { limitKey: limitKey, count: 1, windowStart: now },
            update: { count: { increment: 1 } },
        });
    }

    // Repart d'une nouvelle fenêtre : compteur à zéro, plus de blocage
    async restartWindow(limitKey: string, now: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.rateLimit.updateMany({
            where: { limitKey: limitKey },
            data: { count: 0, windowStart: now, blockedUntil: null },
        });
    }

    // Fixe la fin du blocage
    async setBlockedUntil(limitKey: string, blockedUntil: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.rateLimit.updateMany({
            where: { limitKey: limitKey },
            data: { blockedUntil: blockedUntil },
        });
    }

    // Supprime le compteur d'une clé (ne fait rien s'il n'existe pas)
    async deleteByKey(limitKey: string, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.rateLimit.deleteMany({ where: { limitKey: limitKey } });
    }

    // Supprime les anciens compteurs : fenêtre commencée avant la date donnée, et plus bloqués
    async deleteExpired(windowBefore: Date, now: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.rateLimit.deleteMany({
            where: {
                windowStart: { lt: windowBefore },
                OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
            },
        });
    }
}