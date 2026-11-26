import { BaseController } from "@/controllers/base.controller";
import { AccountService } from "@/services/account.service";
import {
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    updateProfileSchema,
} from "@/validations/account.validation";

export class AccountController extends BaseController {
    private accountService: AccountService;

    constructor(accountService: AccountService) {
        super();
        this.accountService = accountService;
    }

    // POST /api/auth/forgot-password : demande un code (même réponse que le compte existe ou non)
    async forgotPassword(req: Request) {
        try {
            const data = await this.readAndValidateBody(req, forgotPasswordSchema);
            await this.accountService.forgotPassword(data.email, this.getClientIp(req));
            return this.ok({ message: "Si un compte existe pour cet email, un code de réinitialisation a été envoyé." });
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/auth/reset-password : code + nouveau mot de passe
    async resetPassword(req: Request) {
        try {
            const data = await this.readAndValidateBody(req, resetPasswordSchema);
            await this.accountService.resetPassword(data, this.getClientIp(req));
            return this.ok({ message: "Mot de passe modifié. Vous pouvez vous connecter." });
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/users/me/password : changer son mot de passe (connecté)
    async changePassword(req: Request) {
        try {
            const session = await this.requireSession();
            const data = await this.readAndValidateBody(req, changePasswordSchema);
            await this.accountService.changePassword(session.userId, data);
            return this.ok({ message: "Mot de passe modifié." });
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PATCH /api/users/me : modifier son profil (nom, prénom, téléphone ; date de naissance et adresse pour un client)
    async updateProfile(req: Request) {
        try {
            const session = await this.requireSession();
            const data = await this.readAndValidateBody(req, updateProfileSchema);
            const profile = await this.accountService.updateProfile(session.userId, session.role, data);
            return this.ok(profile);
        } catch (error) {
            return this.handleError(error);
        }
    }
}
