import { BaseController } from "@/controllers/base.controller";
import { UnavailabilityService } from "@/services/unavailability.service";
import { unavailabilitySchema } from "@/validations/unavailability.validation";

export class UnavailabilityController extends BaseController {
    private unavailabilityService: UnavailabilityService;

    constructor(unavailabilityService: UnavailabilityService) {
        super();
        this.unavailabilityService = unavailabilityService;
    }

    // GET /api/professionals/me/unavailabilities : mes indisponibilités (professionnel)
    async listMine() {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const items = await this.unavailabilityService.listByProfessional(session.userId);
            return this.ok(items);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/professionals/me/unavailabilities : créer une indisponibilité
    async create(req: Request) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const data = await this.readAndValidateBody(req, unavailabilitySchema);
            const item = await this.unavailabilityService.create(session.userId, data);
            return this.created(item);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PUT /api/professionals/me/unavailabilities/[unavailabilityId] : remplacer une indisponibilité
    async update(req: Request, unavailabilityIdText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const unavailabilityId = this.parseId(unavailabilityIdText);
            const data = await this.readAndValidateBody(req, unavailabilitySchema);
            const item = await this.unavailabilityService.update(session.userId, unavailabilityId, data);
            return this.ok(item);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // DELETE /api/professionals/me/unavailabilities/[unavailabilityId] : supprimer une indisponibilité
    async remove(unavailabilityIdText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const unavailabilityId = this.parseId(unavailabilityIdText);
            const result = await this.unavailabilityService.remove(session.userId, unavailabilityId);
            return this.ok(result);
        } catch (error) {
            return this.handleError(error);
        }
    }
}