import { AuthService } from "@/services/auth.service";

// IMPORTATION DES INTERFACES DES INPUT DANS LE REPO USER
import {
    NewUserData,
    NewVerificationData
} from "@/repositories/user.repository";

// IMPORTATION DES REPO APPLIQUER DANS LE SERVICE
import type { UserRepository } from "@/repositories/user.repository";
import type { EmailVerificationRepository } from "@/repositories/email-verification.repository";

// IMPORTATION DU REPO DU LIMITATION DE TENTATIVE DE CONNEXION
import { RateLimitRepository } from "@/repositories/rate-limit.repository";

// IMPORTATION DU SERVICE DU LIMITATION DE TENTATIVE DE CONNEXION
import { RateLimitService } from "@/services/rate-limit.service";

// L'ENVOYE DE L'EMAIL 
import { EmailSender } from "@/lib/server/email/email-sender";
import { SmtpEmailSender } from "@/lib/server/email/smtp-email-sender";
import { readSmtpConfig } from "@/lib/server/email/smtp-config";

import {
    hashPassword,
    verifyPassword,
    Role
} from "@/lib/server/auth/auth"

import {
    generateCode,
    hashCode,
    codesMatch,
    CODE_LIFETIME_MINUTES,
    MAX_CODE_ATTEMPTS,
    RESEND_DELAY_SECONDS,
    UNVERIFIED_ACCOUNT_LIFETIME_HOURS

} from "@/lib/server/auth/verification-code";

import {
    LOGIN_BY_PAIR_RULE,
    LOGIN_BY_EMAIL_RULE,
    LOGIN_BY_IP_RULE,
    REGISTER_BY_IP_RULE,
    VERIFY_BY_IP_RULE,
    RESEND_BY_IP_RULE,
    ACCOUNT_NOTICE_RULE,
    RateLimitRule
} from "@/lib/server/auth/rate-limit-rules";

// IMPORTATION DES DIFFERENTS ERRORS
import {
    ConflictError,
    ForbiddenError,
    ServiceUnavailableError,
    TooManyRequestsError,
    UnauthorizedError,
    ValidationError,
} from "@/lib/server/http/errors";

// IMPORTATION DES DONNÉE EN INPUT POUR LES SERVICES D'AUTHENTIFICATION
import {
    RegisterData,
    LoginData,
    VerifyEmailData
} from "@/services/auth.service";

// TYPE DE DONNÉE RETOURNER ET LA FORME MINIMALE D'UN UTILISATEUR
import { AuthUser, RegisterResult } from "@/services/auth.service";


// ON MOCK LES PATH
jest.mock("@/repositories/user.repository", (() => { }));
jest.mock("@/repositories/email-verification.repository", (() => { }));
jest.mock("@/repositories/rate-limit.repository", (() => { }));
jest.mock("@/lib/server/auth/auth", (() => ({
    // On initialise avec un type qui retourne le meme password d'entrée
    hashPassword: async (pwd: string) => pwd,
    // On initiliase avec un type qui retourne une boolean
    verifyPassword: async (pwd: string, pwdHash: string) => pwd === pwdHash
})))

type mockUserRepository = {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    createClientUser: jest.Mock;
    createProfessionalUser: jest.Mock;
    markEmailVerified: jest.Mock;
    deleteById: jest.Mock;
    deleteUnverifiedCreatedBefore: jest.Mock;
}

type mockEmailVerificationRepository = {
    findByUserId: jest.Mock;
    upsert: jest.Mock;
    incrementAttempts: jest.Mock;
}

type mockRateLimitService = {
    getRetryAfterSeconds: jest.Mock;
    registerFailure: jest.Mock;
    reset: jest.Mock;
}

// OUTPUT : Forme minimale d'un utilisateur
interface UserWithProfiles {
    userId: number;
    lastName: string;
    firstName: string;
    email: string;
    phoneNumber: string | null;
    client: object | null;
    professional: object | null;
}


let mockUserRepo: mockUserRepository;
let mockEmailVerificationRepo: mockEmailVerificationRepository;
let mockRateLimitServ: mockRateLimitService;

let emailSender: EmailSender;
emailSender = new SmtpEmailSender(readSmtpConfig(process.env));
let requireEmailVerification = true;


let authService: AuthService;

/**
 * 
 * @returns {object} { findBykey, incrementFailures, restartWindow, setBlockWindow, deleteByKey, deleteExpired }
 */
function makeInMemoryRateLimitRepository() {
    interface Row {
        limitKey: string;
        count: number;
        windowStart: Date;
        BlockedUntil: Date | null;
    }

    const rows = new Map<string, Row>();

    return {
        findByKey: async (key: string) => rows.get(key) ?? null,
        incrementFailures: async (key: string, now: Date) => {
            const row = rows.get(key) ?? {
                limitKey: key,
                count: 0,
                windowStart: now,
                BlockedUntil: null
            };
            row.count = row.count + 1;
            rows.set(key, row);
            return row;
        },
        restartWindow: async (key: string, now: Date) => {
            const row = rows.get(key);
            if (row) {
                row.count = 0;
                row.windowStart = now;
                row.BlockedUntil = null;
            }
        },
        setBlockedUntil: async (key: string, blockedUntil: Date) => {
            const row = rows.get(key);
            if (row) {
                row.BlockedUntil = blockedUntil;
            }
        },
        deleteByKey: async (key: string) => {
            rows.delete(key);
        },
        deleteExpired: async () => undefined,
    }
}

function makeRegisterData(): RegisterData {
    return {
        role: "CLIENT",
        lastName: "Christian",
        firstName: "RANDRIA",
        email: "andryanandrianina@gmail.com",
        password: "Motdepasse@123"
    }
}
function makeIpAddress(): string | null {
    return "192.168.56.1"
}

beforeEach(() => {
    jest.resetAllMocks();

    mockUserRepo = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        createClientUser: jest.fn(),
        createProfessionalUser: jest.fn(),
        markEmailVerified: jest.fn(),
        deleteById: jest.fn(),
        deleteUnverifiedCreatedBefore: jest.fn()
    }
    mockEmailVerificationRepo = {
        findByUserId: jest.fn(),
        upsert: jest.fn(),
        incrementAttempts: jest.fn(),
    }

    const rateLimitService = new RateLimitService(makeInMemoryRateLimitRepository() as unknown as RateLimitRepository)

    authService = new AuthService(
        mockUserRepo as unknown as UserRepository,
        mockEmailVerificationRepo as unknown as EmailVerificationRepository,
        emailSender,
        requireEmailVerification,
        rateLimitService
    )

})

describe("authService.register", () => {
    test("Renvoie les informations de l'utilisateur apres l'inscriptions", () => {
        /// Initiation avec les données 
        const result = authService.register(makeRegisterData(), makeIpAddress());


        /// Retourne l'utilisateur inscrit SURTOUT L'ID
        mockUserRepo.createClientUser.mockReturnValue({
            userId: 10,
            lastName: 'Christian',
            firstName: 'RANDRIA',
            email: 'andryanandrianina@gmail.com',
            passwordHash: '$2b$10$msO8o1zxu8c9xxsm7gWuwOXyG1EoblqxDIVADKWCiOOrwF0OXFOXu',
            phoneNumber: null,
            emailVerifiedAt: null,
            createdAt: "2026 - 11 - 25T08: 58: 17.482Z",
            updatedAt: "2026 - 11 - 25T08: 58: 17.482Z",
            client: { userId: 10, birthDate: null, address: null },
            professional: null
        })


        expect(result).toEqual({
            email: "andryanandrianina@gmail.com",
            verificationRequired: false,
            user: {
                userId: 10,
                lastName: "Christian",
                firstName: "RANDRIA",
                email: "andryanandrianina@gmail.com",
                phoneNumber: null,
                role: "CLIENT"
            }
        })
    })
})