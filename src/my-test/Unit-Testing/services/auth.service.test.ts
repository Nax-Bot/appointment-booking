import { createHash } from "crypto";

// IMPORTATION DES INTERFACES DES INPUT DANS LE REPO USER
import {
    NewUserData,
    NewVerificationData
} from "@/repositories/user.repository";

// IMPORTATION DES REPO APPLIQUER DANS LE SERVICE
import { UserRepository } from "@/repositories/user.repository";
import { EmailVerificationRepository } from "@/repositories/email-verification.repository";

// IMPORTATION DU LOGIQUE METIER DU LIMITATION DE TENTATIVE DE CONNEXION
import { RateLimitService } from "@/services/rate-limit.service";

import { EmailSender } from "@/lib/email-sender";
import {
    hashPassword,
    verifyPassword,
    Role
} from "@/lib/auth";

import {
    generateCode,
    hashCode,
    codesMatch,
    CODE_LIFETIME_MINUTES,
    MAX_CODE_ATTEMPTS,
    RESEND_DELAY_SECONDS,
    UNVERIFIED_ACCOUNT_LIFETIME_HOURS

} from "@/lib/verification-code";

import {
    LOGIN_BY_PAIR_RULE,
    LOGIN_BY_EMAIL_RULE,
    LOGIN_BY_IP_RULE,
    REGISTER_BY_IP_RULE,
    VERIFY_BY_IP_RULE,
    RESEND_BY_IP_RULE,
    ACCOUNT_NOTICE_RULE,
    RateLimitRule
} from "@/lib/rate-limit-rules";

// IMPORTATION DES DIFFERENTS ERRORS
import {
    ConflictError,
    ForbiddenError,
    ServiceUnavailableError,
    TooManyRequestsError,
    UnauthorizedError,
    ValidationError,
} from "@/lib/errors";

// IMPORTATION DES DONNÉE EN INPUT POUR LES SERVICES D'AUTHENTIFICATION
import {
    RegisterData,
    LoginData,
    VerifyEmailData
} from "@/services/auth.service";

import { AuthUser, RegisterResult } from "@/services/auth.service";
import { Fn } from "@prisma/client/runtime/client";

// ON MOCK LES PATH
jest.mock("@/repositories/user.repository", (() => { }));
jest.mock("@/repositories/email-verification.repository", (() => { }));

jest.mock("@/services/rate-limit.service", (() => { }));

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
        findByUserId : jest.fn(),
        upsert : jest.fn(),
        incrementAttempts : jest.fn(),
    }
})
