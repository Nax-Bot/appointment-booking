import { UserRepository, NewUserData, NewVerificationData } from "@/repositories/user.repository";
import { EmailVerificationRepository } from "@/repositories/email-verification.repository";
import { EmailSender } from "@/lib/email-sender";
import { hashPassword, verifyPassword, Role } from "@/lib/auth";
import {
    generateCode,
    hashCode,
    codesMatch,
    CODE_LIFETIME_MINUTES,
    MAX_CODE_ATTEMPTS,
    RESEND_DELAY_SECONDS,
    UNVERIFIED_ACCOUNT_LIFETIME_HOURS,
} from "@/lib/verification-code";
import {
    ConflictError,
    ForbiddenError,
    TooManyRequestsError,
    UnauthorizedError,
    ValidationError,
} from "@/lib/errors";

// Pour l'inscription
export interface RegisterData {
    role: Role;
    lastName: string;
    firstName: string;
    email: string;
    password: string;
    phoneNumber?: string;
}

// Ce que renvoie l'inscription :
// - verificationRequired = true : un code a été envoyé, il n'y a pas encore d'utilisateur connecté (user vaut null)
// - verificationRequired = false : le compte est déjà vérifié (mode développement), user est rempli
export interface RegisterResult {
    email: string;
    verificationRequired: boolean;
    user: AuthUser | null;
}

// Pour la connexion
export interface LoginData {
    email: string;
    password: string;
}

// Pour la vérification de l'email
export interface VerifyEmailData {
    email: string;
    code: string;
}

// Donnée renvoyée pour l'utilisateur
export interface AuthUser {
    userId: number;
    lastName: string;
    firstName: string;
    email: string;
    phoneNumber?: string | null;
    role: Role;
}

// Forme minimale d'un utilisateur
interface UserWithProfiles {
    userId: number;
    lastName: string;
    firstName: string;
    email: string;
    phoneNumber: string | null;
    client: object | null;
    professional: object | null;
}

export class AuthService {
    private userRepository: UserRepository;
    private emailVerificationRepository: EmailVerificationRepository;
    private emailSender: EmailSender;
    private requireEmailVerification: boolean;

    constructor(
        userRepository: UserRepository,
        emailVerificationRepository: EmailVerificationRepository,
        emailSender: EmailSender,
        requireEmailVerification: boolean
    ) {
        this.userRepository = userRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.emailSender = emailSender;
        this.requireEmailVerification = requireEmailVerification;
    }

    async register(data: RegisterData): Promise<RegisterResult> {
        const now = new Date();

        // Nettoyage au passage : on supprime les comptes jamais vérifiés depuis trop longtemps
        const limit = new Date(now.getTime() - UNVERIFIED_ACCOUNT_LIFETIME_HOURS * 60 * 60 * 1000);
        await this.userRepository.deleteUnverifiedCreatedBefore(limit);

        // Email -> un seul compte
        const existingUser = await this.userRepository.findByEmail(data.email);

        if (existingUser) {
            // Un compte vérifié : l'email est vraiment pris
            if (existingUser.emailVerifiedAt !== null) {
                throw new ConflictError("Cet email est deja utilisé");
            }

            // Un compte NON vérifié : on empêche d'inonder la boîte mail de quelqu'un
            if (existingUser.emailVerification !== null) {
                const waitedMs = now.getTime() - existingUser.emailVerification.lastSentAt.getTime();
                if (waitedMs < RESEND_DELAY_SECONDS * 1000) {
                    throw new TooManyRequestsError("Un code vient d'être envoyé. Réessayez dans un instant.");
                }
            }

            // Sinon, l'ancien compte non vérifié est remplacé par celui-ci
            // (ainsi le vrai propriétaire de l'email peut toujours s'inscrire)
            await this.userRepository.deleteById(existingUser.userId);
        }

        const passwordHash = await hashPassword(data.password);

        let phoneNumber: string | null = null;
        if (data.phoneNumber) {
            phoneNumber = data.phoneNumber;
        }

        // Selon le réglage : un compte à vérifier avec un code, ou un compte déjà vérifié
        let emailVerifiedAt: Date | null = null;
        let verification: NewVerificationData | null = null;
        let code = "";

        if (this.requireEmailVerification) {
            code = generateCode();
            verification = {
                codeHash: hashCode(data.email, code),
                expiresAt: new Date(now.getTime() + CODE_LIFETIME_MINUTES * 60 * 1000),
                lastSentAt: now,
            };
        } else {
            emailVerifiedAt = now;
        }

        const newUserData: NewUserData = {
            lastName: data.lastName,
            firstName: data.firstName,
            email: data.email,
            passwordHash: passwordHash,
            phoneNumber: phoneNumber,
            emailVerifiedAt: emailVerifiedAt,
            verification: verification,
        };

        let createdUser: UserWithProfiles;
        try {
            if (data.role === "CLIENT") {
                createdUser = await this.userRepository.createClientUser(newUserData);
            } else {
                createdUser = await this.userRepository.createProfessionalUser(newUserData);
            }
        } catch (error) {
            // Cas rare : deux inscriptions avec le même email au même instant
            if (this.isUniqueConstraintError(error)) {
                throw new ConflictError("Cet email est déjà utilisé");
            }
            throw error;
        }

        if (this.requireEmailVerification) {
            await this.emailSender.sendVerificationCode(data.email, code);
            return { email: data.email, verificationRequired: true, user: null };
        }

        return { email: data.email, verificationRequired: false, user: this.toAuthUser(createdUser) };
    }

    // Vérifie le code reçu par email. Si tout est bon, le compte devient vérifié et on renvoie l'utilisateur.
    async verifyEmail(data: VerifyEmailData): Promise<AuthUser> {
        // Un seul message pour tous les cas d'échec : on ne révèle pas si un compte existe
        const invalidMessage = "Code invalide ou expiré";

        const user = await this.userRepository.findByEmail(data.email);

        if (!user || user.emailVerifiedAt !== null || user.emailVerification === null) {
            throw new ValidationError(invalidMessage, []);
        }

        const verification = user.emailVerification;
        const now = new Date();

        // Règle 1 : le code n'est pas expiré
        if (verification.expiresAt.getTime() <= now.getTime()) {
            throw new ValidationError(invalidMessage, []);
        }

        // Règle 2 : il reste des essais
        if (verification.attempts >= MAX_CODE_ATTEMPTS) {
            throw new TooManyRequestsError("Trop d'essais. Demandez un nouveau code.");
        }

        // Règle 3 : le code est le bon. Sinon, on compte l'essai.
        const sentHash = hashCode(data.email, data.code);
        if (codesMatch(sentHash, verification.codeHash) === false) {
            await this.emailVerificationRepository.incrementAttempts(user.userId);
            throw new ValidationError(invalidMessage, []);
        }

        const verifiedUser = await this.userRepository.markEmailVerified(user.userId, now);
        return this.toAuthUser(verifiedUser);
    }

    // Envoie un nouveau code. La réponse est toujours la même, que l'email existe ou non :
    // si on ne peut pas envoyer (compte inconnu, déjà vérifié, trop tôt), on ne fait rien.
    async resendCode(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);

        if (!user || user.emailVerifiedAt !== null) {
            return;
        }

        const now = new Date();

        if (user.emailVerification !== null) {
            const waitedMs = now.getTime() - user.emailVerification.lastSentAt.getTime();
            if (waitedMs < RESEND_DELAY_SECONDS * 1000) {
                return;
            }
        }

        const code = generateCode();
        const expiresAt = new Date(now.getTime() + CODE_LIFETIME_MINUTES * 60 * 1000);
        await this.emailVerificationRepository.upsert(user.userId, hashCode(email, code), expiresAt, now);
        await this.emailSender.sendVerificationCode(email, code);
    }

    async login(data: LoginData): Promise<AuthUser> {
        const user = await this.userRepository.findByEmail(data.email);

        // Même message dans les deux cas pour ne pas révéler si l'email existe
        if (!user) {
            throw new UnauthorizedError("Email ou mot de passe incorrect");
        }

        const passwordIsCorrect = await verifyPassword(data.password, user.passwordHash);
        if (!passwordIsCorrect) {
            throw new UnauthorizedError("Email ou mot de passe incorrect");
        }

        // Le mot de passe est bon, mais l'email n'est pas encore vérifié
        if (user.emailVerifiedAt === null) {
            throw new ForbiddenError(
                "Votre email n'est pas encore vérifié. Entrez le code reçu ou demandez-en un nouveau.",
                ["code : EMAIL_NOT_VERIFIED"]
            );
        }

        return this.toAuthUser(user);
    }

    async getMe(userId: number): Promise<AuthUser> {
        const user = await this.userRepository.findById(userId);

        // Le cookie existe mais le compte a ete supprime entre-temps
        if (!user) {
            throw new UnauthorizedError("Session invalide");
        }
        return this.toAuthUser(user);
    }

    // Le rôle se déduit de la fiche liée : client ou professionnel
    private getRole(user: UserWithProfiles): Role {
        if (user.client !== null) {
            return "CLIENT";
        }
        if (user.professional !== null) {
            return "PROFESSIONAL";
        }
        throw new UnauthorizedError("Ce compte n'a aucun rôle");
    }

    // Transforme un utilisateur de la base en AuthUser (sans le hash)
    private toAuthUser(user: UserWithProfiles): AuthUser {
        return {
            userId: user.userId,
            lastName: user.lastName,
            firstName: user.firstName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: this.getRole(user),
        };
    }

    // P2002 est le code de Prisma pour une contrainte d'unicité violée
    private isUniqueConstraintError(error: unknown): boolean {
        if (error === null || typeof error !== "object") {
            return false;
        }
        const prismaError = error as { code?: string };
        return prismaError.code === "P2002";
    }
}