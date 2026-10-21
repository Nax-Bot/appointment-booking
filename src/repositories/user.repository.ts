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

    async findById(userId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.findUnique({
            where: { userId: userId },
            include: { client: true, professional: true }
        });
    }

    async createClientUser(data: NewUserData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.create({
            data: {
                lastName: data.lastName,
                firstName: data.firstName,
                email: data.email,
                passwordHash: data.passwordHash,
                phoneNumber: data.phoneNumber,
                client: { create: {} },
            },
            include: { client: true, professional: true }
        });
    }

    async createProfessionalUser(data: NewUserData, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.create({
            data: {
                lastName: data.lastName,
                firstName: data.firstName,
                email: data.email,
                passwordHash: data.passwordHash,
                phoneNumber: data.phoneNumber,
                professional: { create: {} },
            },
            include: { client: true, professional: true },
        });
    }
}