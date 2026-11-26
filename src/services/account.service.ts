import { createHash } from "crypto";
import type { UserRepository } from "@/repositories/user.repository";
import type { PasswordResetRepository } from "@/repositories/password-reset.repository";
import type { RateLimitService } from "@/services/rate-limit.service";
import type { EmailSender } from "@/lib/server/email/email-sender";
import { hashPassword, verifyPassword, Role } from "@/lib/server/auth/auth";
import { generateCode, hashCode, codesMatch } from "@/lib/server/auth/verification-code";
import { RESET_CODE_LIFETIME_MINUTES, MAX_RESET_ATTEMPTS, NAME_CHANGE_COOLDOWN_DAYS } from "@/lib/server/auth/account-rules";
import {
    FORGOT_BY_IP_RULE,
    FORGOT_BY_EMAIL_RULE,
    RESET_BY_IP_RULE,
    CHANGE_PASSWORD_RULE,
    RateLimitRule,
} from "@/lib/server/auth/rate-limit-rules";
import { buildPasswordResetEmail, buildPasswordChangedEmail } from "@/lib/server/email/email-templates";
import { ConflictError, TooManyRequestsError, UnauthorizedError, ValidationError } from "@/lib/server/http/errors";

export interface ResetPasswordInput {
    email: string;
    code: string;
    newPassword: string;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

export interface UpdateProfileInput {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
    birthDate?: string | null; // AAAA-MM-JJ, clients seulement
    address?: string | null; // clients seulement
}

// Le profil renvoyé après une modification
export interface Profile {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    role: Role;
    birthDate: string | null; // clients seulement, sinon null
    address: string | null; // clients seulement, sinon null
    // Date à partir de laquelle on pourra changer son nom ou son prénom (null : dès maintenant)
    nameChangeAvailableAt: string | null;
}

export class AccountService {
    constructor(
        private userRepository: UserRepository,
        private passwordResetRepository: PasswordResetRepository,
        private rateLimitService: RateLimitService,
        private emailSender: EmailSender
    ) {}

    // ---------- Mot de passe oublié ----------

    // Envoie un code par email. La réponse est TOUJOURS la même (compte existant ou non) :
    // on ne révèle jamais si une adresse a un compte.
    async forgotPassword(email: string, ipAddress: string | null): Promise<void> {
        await this.enforceLimit("forgot:ip:", ipAddress, FORGOT_BY_IP_RULE);

        const user = await this.userRepository.findByEmail(email);
        // Seuls les comptes vérifiés peuvent réinitialiser (un compte non vérifié n'est pas encore à son propriétaire)
        if (!user || user.emailVerifiedAt === null) {
            return;
        }

        // Au plus 3 emails par heure pour la même adresse : en cas de dépassement, on ne fait rien (en silence)
        const emailKey = "forgot:email:" + createHash("sha256").update(email).digest("hex");
        if ((await this.rateLimitService.getRetryAfterSeconds(emailKey)) > 0) {
            return;
        }
        await this.rateLimitService.registerFailure(emailKey, FORGOT_BY_EMAIL_RULE);

        const now = new Date();
        const code = generateCode();
        const expiresAt = new Date(now.getTime() + RESET_CODE_LIFETIME_MINUTES * 60 * 1000);
        await this.passwordResetRepository.upsert(user.userId, this.hashResetCode(email, code), expiresAt, now);

        // Une panne d'envoi est seulement affichée : l'annoncer (erreur 503) révélerait que le compte existe
        try {
            await this.emailSender.sendNotification(email, buildPasswordResetEmail(code, RESET_CODE_LIFETIME_MINUTES));
        } catch (error) {
            console.error("Échec de l'envoi du code de réinitialisation :", error);
        }
    }

    // Vérifie le code puis change le mot de passe. Un seul message pour tous les échecs.
    async resetPassword(input: ResetPasswordInput, ipAddress: string | null): Promise<void> {
        await this.enforceLimit("reset:ip:", ipAddress, RESET_BY_IP_RULE);

        const invalidMessage = "Code invalide ou expiré";

        const user = await this.userRepository.findByEmail(input.email);
        if (!user || user.emailVerifiedAt === null) {
            throw new ValidationError(invalidMessage, []);
        }

        const reset = await this.passwordResetRepository.findByUserId(user.userId);
        if (!reset) {
            throw new ValidationError(invalidMessage, []);
        }

        if (reset.expiresAt.getTime() <= Date.now()) {
            throw new ValidationError(invalidMessage, []);
        }
        if (reset.attempts >= MAX_RESET_ATTEMPTS) {
            throw new TooManyRequestsError("Trop d'essais. Demandez un nouveau code.");
        }

        const sentHash = this.hashResetCode(input.email, input.code);
        if (codesMatch(sentHash, reset.codeHash) === false) {
            await this.passwordResetRepository.incrementAttempts(user.userId);
            throw new ValidationError(invalidMessage, []);
        }

        // Le nouveau mot de passe est enregistré ET le code supprimé en une seule opération (il ne sert qu'une fois)
        const newHash = await hashPassword(input.newPassword);
        await this.userRepository.resetPassword(user.userId, newHash);

        // La personne légitime n'est plus bloquée par d'anciens échecs de connexion
        await this.rateLimitService.reset("login:email:" + input.email);

        await this.sendPasswordChangedNotice(input.email);
    }

    // ---------- Changer son mot de passe (connecté) ----------

    async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
        const key = "chpw:user:" + userId;
        const waitSeconds = await this.rateLimitService.getRetryAfterSeconds(key);
        if (waitSeconds > 0) {
            const minutes = Math.ceil(waitSeconds / 60);
            throw new TooManyRequestsError("Trop d'essais. Réessayez dans " + minutes + " minute(s).", waitSeconds);
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedError("Session invalide");
        }

        const currentIsRight = await verifyPassword(input.currentPassword, user.passwordHash);
        if (currentIsRight === false) {
            await this.rateLimitService.registerFailure(key, CHANGE_PASSWORD_RULE);
            throw new ValidationError("Données invalides", ["currentPassword : mot de passe actuel incorrect"]);
        }

        const sameAsBefore = await verifyPassword(input.newPassword, user.passwordHash);
        if (sameAsBefore) {
            throw new ValidationError("Données invalides", ["newPassword : le nouveau mot de passe doit être différent de l'actuel"]);
        }

        const newHash = await hashPassword(input.newPassword);
        await this.userRepository.updatePassword(userId, newHash);
        await this.rateLimitService.reset(key);

        await this.sendPasswordChangedNotice(user.email);
    }

    // ---------- Modifier son profil ----------

    // Nom et prénom : une modification tous les 30 jours. Téléphone (et, pour un client, date de naissance
    // et adresse) : libres. Le profil professionnel (description, spécialité) reste dans PATCH /api/professionals/me.
    async updateProfile(userId: number, role: Role, input: UpdateProfileInput): Promise<Profile> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedError("Session invalide");
        }

        // Ces deux champs n'existent que sur la fiche client
        const wantsClientFields = input.birthDate !== undefined || input.address !== undefined;
        if (wantsClientFields && role !== "CLIENT") {
            throw new ValidationError("Données invalides", ["birthDate / address : réservés aux clients"]);
        }

        const now = new Date();
        const data: Parameters<UserRepository["updateProfile"]>[1] = {};

        // Nom / prénom : seulement ce qui change vraiment
        const firstNameChanges = input.firstName !== undefined && input.firstName !== user.firstName;
        const lastNameChanges = input.lastName !== undefined && input.lastName !== user.lastName;
        if (firstNameChanges || lastNameChanges) {
            const availableAt = this.nameChangeAvailableAt(user.nameChangedAt);
            if (availableAt !== null && availableAt.getTime() > now.getTime()) {
                throw new ConflictError("Vous ne pouvez pas encore modifier votre nom", [
                    "Prochaine modification possible à partir du " + availableAt.toISOString().slice(0, 10),
                ]);
            }
            if (firstNameChanges) data.firstName = input.firstName;
            if (lastNameChanges) data.lastName = input.lastName;
            data.nameChangedAt = now;
        }

        if (input.phoneNumber !== undefined && input.phoneNumber !== user.phoneNumber) {
            data.phoneNumber = input.phoneNumber;
        }

        if (role === "CLIENT" && user.client) {
            const clientData: { birthDate?: Date | null; address?: string | null } = {};
            if (input.birthDate !== undefined) {
                clientData.birthDate = input.birthDate === null ? null : new Date(input.birthDate + "T00:00:00.000Z");
            }
            if (input.address !== undefined && input.address !== user.client.address) {
                clientData.address = input.address;
            }
            if (Object.keys(clientData).length > 0) {
                data.client = clientData;
            }
        }

        // Rien ne change vraiment : on renvoie le profil tel quel
        if (Object.keys(data).length === 0) {
            return this.toProfile(user, role);
        }

        const updated = await this.userRepository.updateProfile(userId, data);
        return this.toProfile(updated, role);
    }

    // ---------- Petits outils ----------

    // L'empreinte d'un code de réinitialisation. Le préfixe "reset:" sépare ces codes de ceux de la vérification d'email.
    private hashResetCode(email: string, code: string): string {
        return hashCode("reset:" + email, code);
    }

    // Quand pourra-t-on changer de nom ? null = dès maintenant (jamais changé)
    private nameChangeAvailableAt(nameChangedAt: Date | null): Date | null {
        if (nameChangedAt === null) {
            return null;
        }
        return new Date(nameChangedAt.getTime() + NAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    }

    // Prévient par email que le mot de passe a changé. Une panne d'envoi ne doit pas annuler le changement.
    private async sendPasswordChangedNotice(email: string): Promise<void> {
        try {
            await this.emailSender.sendNotification(email, buildPasswordChangedEmail());
        } catch (error) {
            console.error("Échec de l'envoi de l'avis de changement de mot de passe :", error);
        }
    }

    private async enforceLimit(prefix: string, ipAddress: string | null, rule: RateLimitRule): Promise<void> {
        if (ipAddress === null) {
            return;
        }
        const key = prefix + ipAddress;
        const waitSeconds = await this.rateLimitService.getRetryAfterSeconds(key);
        if (waitSeconds > 0) {
            const minutes = Math.ceil(waitSeconds / 60);
            throw new TooManyRequestsError("Trop de demandes. Réessayez dans " + minutes + " minute(s).", waitSeconds);
        }
        await this.rateLimitService.registerFailure(key, rule);
    }

    private toProfile(
        user: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            phoneNumber: string | null;
            nameChangedAt: Date | null;
            client: { birthDate: Date | null; address: string | null } | null;
        },
        role: Role
    ): Profile {
        const availableAt = this.nameChangeAvailableAt(user.nameChangedAt);
        const stillWaiting = availableAt !== null && availableAt.getTime() > Date.now();
        return {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: role,
            birthDate: user.client && user.client.birthDate ? user.client.birthDate.toISOString().slice(0, 10) : null,
            address: user.client ? user.client.address : null,
            nameChangeAvailableAt: stillWaiting && availableAt !== null ? availableAt.toISOString() : null,
        };
    }
}
