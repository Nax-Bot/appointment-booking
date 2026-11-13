import { BaseController } from "@/controllers/base.controller";
import { AuthService } from "@/services/auth.service";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendCodeSchema,
} from "@/validations/auth.validation";
import { createSession, destroySession } from "@/lib/session";

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    super();
    this.authService = authService;
  }

  // POST /api/auth/register : crée le compte.
  // Si la vérification de l'email est exigée, il n'y a PAS de session : elle s'ouvrira après la vérification.
  async register(req: Request) {
    try {
      const data = await this.readAndValidateBody(req, registerSchema);
      const result = await this.authService.register(data);

      if (result.user !== null) {
        await createSession(result.user.userId, result.user.role);
      }

      return this.created(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // POST /api/auth/verify-email : vérifie le code, puis ouvre la session
  async verifyEmail(req: Request) {
    try {
      const data = await this.readAndValidateBody(req, verifyEmailSchema);
      const user = await this.authService.verifyEmail(data);
      await createSession(user.userId, user.role);
      return this.ok(user);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // POST /api/auth/resend-code : renvoie un code (même réponse que le compte existe ou non)
  async resendCode(req: Request) {
    try {
      const data = await this.readAndValidateBody(req, resendCodeSchema);
      await this.authService.resendCode(data.email);
      return this.ok({ message: "Si un compte non vérifié existe pour cet email, un nouveau code a été envoyé." });
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

  // GET /api/auth/me : renvoie l'utilisateur connecté (n'importe quel rôle)
  async me() {
    try {
      const session = await this.requireSession();
      const user = await this.authService.getMe(session.userId);
      return this.ok(user);
    } catch (error) {
      return this.handleError(error);
    }
  }
}