import { BaseController } from "@/controllers/base.controller";
import { AvailabilityService } from "@/services/availability.service";
import { availabilitySchema } from "@/validations/availability.validation";

export class AvailabilityController extends BaseController {
    private availabilityService: AvailabilityService;

    constructor(availabilityService: AvailabilityService) {
        super();
        this.availabilityService = availabilityService;
    }

    // GET /api/professionals/[id]/availabilities : disponibilités d'un professionnel (tout utilisateur connecté)
    async listByProfessional(idText: string) {
        try {
            await this.requireSession();
            const professionalId = this.parseId(idText);
            const items = await this.availabilityService.listByProfessional(professionalId);
            return this.ok(items);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/professionals/me/availabilities : mes disponibilités (professionnel)
    async listMine() {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const items = await this.availabilityService.listByProfessional(session.userId);
            return this.ok(items);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/professionals/me/availabilities : créer une disponibilité
    async create(req: Request) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const data = await this.readAndValidateBody(req, availabilitySchema);
            const item = await this.availabilityService.create(session.userId, data);
            return this.created(item);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PUT /api/professionals/me/availabilities/[availabilityId] : remplacer une disponibilité
    async update(req: Request, availabilityIdText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const availabilityId = this.parseId(availabilityIdText);
            const data = await this.readAndValidateBody(req, availabilitySchema);
            const item = await this.availabilityService.update(session.userId, availabilityId, data);
            return this.ok(item);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // DELETE /api/professionals/me/availabilities/[availabilityId] : supprimer une disponibilité
    async remove(availabilityIdText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const availabilityId = this.parseId(availabilityIdText);
            const result = await this.availabilityService.remove(session.userId, availabilityId);
            return this.ok(result);
        } catch (error) {
            return this.handleError(error);
        }
    }
}