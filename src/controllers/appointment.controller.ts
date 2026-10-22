import { BaseController } from "@/controllers/base.controller";
import { AppointmentService } from "@/services/appointment.service";
import {
    createAppointmentSchema,
    listAppointmentsQuerySchema,
    cancelAppointmentSchema,
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
    async cancel(req: Request, idText: string) {
        try {
            const session = await this.requireSession();
            const id = this.parseId(idText);
            const data = await this.readAndValidateBody(req, cancelAppointmentSchema);
            const appointment = await this.appointmentService.cancel(session.userId, session.role, id, data.reason);
            return this.ok(appointment);
        } catch (error) {
            return this.handleError(error);
        }
    }
}