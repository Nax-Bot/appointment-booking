import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface NewUserData {
    lastName: string;
    firstName: string;
    email: string;
    passwordHash: string;
    phoneNumber: string | null;
}

export class UserRepository {
    async findByEmail(email: string, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.findUnique({
            where: { email: email },
            include: { client: true, professional: true }
        })
    }
}