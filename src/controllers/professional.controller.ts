import { BaseController } from "@/controllers/base.controller";
import { ProfessionalService } from "@/services/professional.service";
import { updateProfessionalSchema, professionalsQuerySchema } from "@/validations/professional.validation";

export class ProfessionalController extends BaseController {
    private professionalService: ProfessionalService;

    constructor(professionalService: ProfessionalService) {
        super();
        this.professionalService = professionalService;
    }

    // GET /api/professionals?search=...&serviceId=... : liste et recherche (tout utilisateur connecté)
    async list(req: Request) {
        try {
            await this.requireSession();
            const query = this.readAndValidateQuery(req, professionalsQuerySchema);

            // serviceId arrive en texte : on le transforme en nombre seulement s'il est présent
            let serviceId: number | undefined = undefined;
            if (query.serviceId !== undefined) {
                serviceId = Number(query.serviceId);
            }

            const professionals = await this.professionalService.search(query.search, serviceId);
            return this.ok(professionals);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/professionals/[id] : un professionnel (tout utilisateur connecté)
    async getById(idText: string) {
        try {
            await this.requireSession();
            const id = this.parseId(idText);
            const professional = await this.professionalService.getById(id);
            return this.ok(professional);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PATCH /api/professionals/me : le professionnel modifie son propre profil
    async updateMyProfile(req: Request) {
        try {
            // On vérifie le rôle AVANT de lire le corps
            const session = await this.requireSession("PROFESSIONAL");
            const data = await this.readAndValidateBody(req, updateProfessionalSchema);
            const professional = await this.professionalService.updateMyProfile(session.userId, data);
            return this.ok(professional);
        } catch (error) {
            return this.handleError(error);
        }
    }
}