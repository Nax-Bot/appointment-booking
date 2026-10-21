import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export class ServiceRepository {
    // Tous les services, triés par nom
    async findAll(db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.service.findMany({ orderBy: { name: "asc" } });
    }

    // Un service par son identifiant (null s'il n'existe pas)
    async findById(id: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.service.findUnique({ where: { id: id } });
    }
}