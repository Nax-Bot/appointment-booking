import { BaseController } from "@/controllers/base.controller";
import { OfferService } from "@/services/offer.service";
import { setOfferSchema } from "@/validations/offer.validation";

export class OfferController extends BaseController {
    private offerService: OfferService;

    constructor(offerService: OfferService) {
        super();
        this.offerService = offerService;
    }

    // GET /api/professionals/[id]/services : services d'un professionnel (tout utilisateur connecté)
    async listByProfessional(idText: string) {
        try {
            await this.requireSession();
            const professionalId = this.parseId(idText);
            const offers = await this.offerService.listByProfessional(professionalId);
            return this.ok(offers);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // GET /api/professionals/me/services : mes propres services (professionnel)
    async listMine() {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const offers = await this.offerService.listByProfessional(session.userId);
            return this.ok(offers);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // PUT /api/professionals/me/services/[serviceId] : proposer un service ou modifier son prix et sa durée
    async setMyOffer(req: Request, serviceIdText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const serviceId = this.parseId(serviceIdText);
            const data = await this.readAndValidateBody(req, setOfferSchema);
            const offer = await this.offerService.setOffer(session.userId, serviceId, data);
            return this.ok(offer);
        } catch (error) {
            return this.handleError(error);
        }
    }

    // DELETE /api/professionals/me/services/[serviceId] : retirer un service de mon offre
    async removeMyOffer(serviceIdText: string) {
        try {
            const session = await this.requireSession("PROFESSIONAL");
            const serviceId = this.parseId(serviceIdText);
            const result = await this.offerService.removeOffer(session.userId, serviceId);
            return this.ok(result);
        } catch (error) {
            return this.handleError(error);
        }
    }
}