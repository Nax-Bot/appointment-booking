import { BaseController } from "@/controllers/base.controller";
import { ServiceService } from "@/services/service.service";

export class ServiceController extends BaseController {
    private serviceService: ServiceService;

    constructor(serviceService: ServiceService) {
        super();
        this.serviceService = serviceService;
    }

    // GET /api/services : liste du catalogue (tout utilisateur connecté)
    async list() {
        try {
            await this.requireSession();
            const services = await this.serviceService.listAll();
            return this.ok(services);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/services/[id] : un service (tout utilisateur connecté)
    async getById(idText: string) {
        try {
            await this.requireSession();
            const id = this.parseId(idText);
            const service = await this.serviceService.getById(id);
            return this.ok(service);
        } catch (error) {
            return this.handleError(error);
        }
    }
}