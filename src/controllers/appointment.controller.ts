import { BaseController } from "@/controllers/base.controller";
import { timingSafeEqual } from "crypto";
import { NotFoundError, UnauthorizedError } from "@/lib/server/http/errors";
import { AppointmentService } from "@/services/appointment.service";
import {
    createAppointmentSchema,
    createManualAppointmentSchema,
    listAppointmentsQuerySchema,
    cancelAppointmentSchema,
    appointmentOutcomeSchema,
} from "@/validations/appointment.validation";

export class AppointmentController extends BaseController {
    private appointmentService: AppointmentService;

    constructor(appointmentService: AppointmentService) {
        super();
        this.appointmentService = appointmentService;
    }

    // POST /api/appointments : un client réserve un rendez-vous
    async create(req: Request) {
        try {
            const session = await this.requireSession("CLIENT");
            const data = await this.readAndValidateBody(req, createAppointmentSchema);
            const appointment = await this.appointmentService.create(session.userId, data);
            return this.created(appointment);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/professionals/me/appointments : un professionnel ajoute un rendez-vous à la main
    async createManual(req: Request) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const data = await this.readAndValidateBody(req, createManualAppointmentSchema);
            const appointment = await this.appointmentService.createManual(session.userId, data);
            return this.created(appointment);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/appointments : mes rendez-vous (client ou professionnel), filtre ?status= facultatif
    async listMine(req: Request) {
        try {
            const session = await this.requireSession();
            const query = this.readAndValidateQuery(req, listAppointmentsQuerySchema);
            const appointments = await this.appointmentService.listMine(session.userId, session.role, query.status);
            return this.ok(appointments);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/appointments/[id] : le détail d'un de mes rendez-vous
    async getById(idText: string) {
        try {
            const session = await this.requireSession();
            const id = this.parseId(idText);
            const appointment = await this.appointmentService.getById(session.userId, session.role, id);
            return this.ok(appointment);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/appointments/[id]/cancel : annuler un de mes rendez-vous (client ou professionnel)
    // La raison est facultative : un corps absent ou vide est accepté (traité comme {}).
    async cancel(req: Request, idText: string) {
        try {
            const session = await this.requireSession();
            const id = this.parseId(idText);
            // CHANGEMENT : on accepte un corps vide
            const data = await this.readAndValidateOptionalBody(req, cancelAppointmentSchema);
            const appointment = await this.appointmentService.cancel(session.userId, session.role, id, data.reason);
            return this.ok(appointment);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/appointments/[id]/outcome : le professionnel marque un rendez-vous terminé ou client absent
    async markOutcome(req: Request, idText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const id = this.parseId(idText);
            const data = await this.readAndValidateBody(req, appointmentOutcomeSchema);
            const appointment = await this.appointmentService.markOutcome(session.userId, id, data.status);
            return this.ok(appointment);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/internal/release-expired : libère les réservations non payées dont le délai est passé.
    // Appelée par une tâche planifiée (cron) avec l'en-tête x-cron-secret = CRON_SECRET du .env.
    // Sans CRON_SECRET dans le .env, la route n'existe pas (404).
    async releaseExpired(req: Request) {
        try {
            const expected = process.env.CRON_SECRET ?? "";
            if (expected.length < 16) {
                throw new NotFoundError("Introuvable");
            }
            const received = req.headers.get("x-cron-secret") ?? "";
            const a = Buffer.from(received);
            const b = Buffer.from(expected);
            if (a.length !== b.length || timingSafeEqual(a, b) === false) {
                throw new UnauthorizedError("Secret invalide");
            }
            const released = await this.appointmentService.releaseExpiredUnpaid();
            return this.ok({ released: released });
        } catch (error) {
            return this.handleError(error);
        }
    }
}
