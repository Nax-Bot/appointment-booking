import { BaseController } from "@/controllers/base.controller";
import { AuthService } from "@/services/auth.service";
import { registerSchema, loginSchema } from "@/validations/auth.validation";
import { createSession, readSession, destroySession } from "@/lib/session";
import { UnauthorizedError } from "@/lib/errors";

export class AuthController extends BaseController {
    private authService: AuthService;

    constructor(authService: AuthService) {
        super();
        this.authService = authService;
    }

    // POST /api/auth/register : crée le compte puis connecte directement la personne
    async register(req: Request) {
        try {
            const data = await this.readAndValidateBody(req, registerSchema);
            const user = await this.authService.register(data);
            await createSession(user.userId, user.role);
            return this.created(user);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/auth/login : vérifie les identifiants puis crée la session
    async login(req: Request) {
        try {
            const data = await this.readAndValidateBody(req, loginSchema);
            const user = await this.authService.login(data);
            await createSession(user.userId, user.role);
            return this.ok(user);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/auth/logout : supprime le cookie de session
    async logout() {
        try {
            await destroySession();
            return this.ok({ message: "Déconnexion réussie" });
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/auth/me : renvoie l'utilisateur connecté
    async me() {
        try {
            const session = await readSession();
            if (!session) {
                throw new UnauthorizedError("Vous devez être connecté");
            }

            const user = await this.authService.getMe(session.userId);
            return this.ok(user);
        } catch (error) {
            return this.handleError(error);
        }
    }
}