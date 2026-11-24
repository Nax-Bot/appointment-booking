import { prisma } from "@/lib/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";

// Le client à passer aux repositories pour que leurs requêtes fassent partie de la transaction
export type DbClient = Prisma.TransactionClient;

// Exécute du travail dans UNE transaction : tout réussit ensemble, ou tout est annulé.
// Les services reçoivent cet objet par leur constructeur (comme les repositories),
// ce qui permet de le remplacer par un faux dans les tests.
export interface TransactionRunner {
    run<T>(work: (db: DbClient) => Promise<T>): Promise<T>;
}

// La vraie version, qui utilise la transaction de Prisma
export class PrismaTransactionRunner implements TransactionRunner {
    async run<T>(work: (db: DbClient) => Promise<T>): Promise<T> {
        return prisma.$transaction(async (tx) => {
            return work(tx);
        });
    }
}