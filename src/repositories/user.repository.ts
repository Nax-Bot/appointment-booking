import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Le code de vérification créé en même temps que le compte
export interface NewVerificationData {
    codeHash: string;
    expiresAt: Date;
    lastSentAt: Date;
}

// Les données nécessaires pour créer un utilisateur
export interface NewUserData {
    lastName: string;
    firstName: string;
    email: string;
    passwordHash: string;
    phoneNumber: string | null;
    emailVerifiedAt: Date | null;
    verification: NewVerificationData | null;
}

export class UserRepository {
    // Cherche un utilisateur par son email (avec ses fiches et son code de vérification en cours)
    async findByEmail(email: string, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.findUnique({
            where: { email: email },
            include: { client: true, professional: true, emailVerification: true },
        });
    }

    // Cherche un utilisateur par son identifiant (avec ses fiches)
    async findById(userId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.findUnique({
            where: { userId: userId },
            include: { client: true, professional: true },
        });
    }

    // Crée un utilisateur ET sa fiche client (et son code de vérification s'il y en a un) en une seule opération
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
                emailVerifiedAt: data.emailVerifiedAt,
                client: { create: {} },
                emailVerification: this.verificationData(data.verification),
            },
            include: { client: true, professional: true },
        });
    }

    // Crée un utilisateur ET sa fiche professionnel (et son code de vérification s'il y en a un) en une seule opération
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
                emailVerifiedAt: data.emailVerifiedAt,
                professional: { create: {} },
                emailVerification: this.verificationData(data.verification),
            },
            include: { client: true, professional: true },
        });
    }

    // Marque l'email comme vérifié ET supprime le code, en une seule opération
    async markEmailVerified(userId: number, verifiedAt: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.update({
            where: { userId: userId },
            data: {
                emailVerifiedAt: verifiedAt,
                emailVerification: { delete: true },
            },
            include: { client: true, professional: true },
        });
    }

    // Supprime un utilisateur (sa fiche et son code partent avec lui)
    async deleteById(userId: number, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.delete({ where: { userId: userId } });
    }

    // Supprime les comptes jamais vérifiés créés avant cette date
    async deleteUnverifiedCreatedBefore(limit: Date, db?: Prisma.TransactionClient) {
        let client: Prisma.TransactionClient = prisma;
        if (db) {
            client = db;
        }

        return client.user.deleteMany({
            where: { emailVerifiedAt: null, createdAt: { lt: limit } },
        });
    }

    // Prépare la partie "code de vérification" de la création (rien s'il n'y en a pas)
    private verificationData(verification: NewVerificationData | null) {
        if (verification === null) {
            return undefined;
        }

        return {
            create: {
                codeHash: verification.codeHash,
                expiresAt: verification.expiresAt,
                lastSentAt: verification.lastSentAt,
            },
        };
    }
}