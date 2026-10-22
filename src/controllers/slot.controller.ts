import { BaseController } from "@/controllers/base.controller";
import { SlotService } from "@/services/slot.service";
import { slotsQuerySchema } from "@/validations/slot.validation";

export class SlotController extends BaseController {
    private slotService: SlotService;

    constructor(slotService: SlotService) {
        super();
        this.slotService = slotService;
    }

    // GET /api/professionals/[id]/slots?serviceId=3&date=2026-11-09 : créneaux libres (tout utilisateur connecté)
    async list(req: Request, idText: string) {
        try {
            await this.requireSession();
            const professionalId = this.parseId(idText);
            const query = this.readAndValidateQuery(req, slotsQuerySchema);
            const serviceId = Number(query.serviceId);
            const result = await this.slotService.getSlots(professionalId, serviceId, query.date);
            return this.ok(result);
        } catch (error) {
            return this.handleError(error);
        }
    }
}