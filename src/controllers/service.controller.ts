import { BaseController } from "@/controllers/base.controller";
import { ServiceService } from "@/services/service.service";
import { createServiceSchema, suggestionsQuerySchema } from "@/validations/service.validation";

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

    // GET /api/services/suggestions?name=... : services dont le nom ressemble (tout utilisateur connecté)
    async suggest(req: Request) {
        try {
            await this.requireSession();
            const query = this.readAndValidateQuery(req, suggestionsQuerySchema);
            const suggestions = await this.serviceService.suggest(query.name);
            return this.ok(suggestions);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // POST /api/services : un professionnel crée un service (et le propose aussitôt)
    async create(req: Request) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const data = await this.readAndValidateBody(req, createServiceSchema);
            const result = await this.serviceService.create(session.userId, data);
            return this.created(result);
        } catch (error) {
            return this.handleError(error);
        }
    }
}