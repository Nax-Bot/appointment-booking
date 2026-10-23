import { OfferRepository } from "@/repositories/offer.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { ServiceRepository } from "@/repositories/service.repository";
import { NotFoundError } from "@/lib/errors";

// Données reçues pour proposer un service : la durée et le prix du professionnel
export interface SetOfferData {
    customPrice: number;
    customDuration: number;
}

// Ce que l'on renvoie : prix et durée effectifs (personnalisés ou ceux du catalogue)
export interface OfferItem {
    serviceId: number;
    name: string;
    description: string | null;
    price: number;
    duration: number;
    customPrice: number | null;
    customDuration: number | null;
}

// Forme d'une offre telle que le repository la renvoie
interface OfferRow {
    serviceId: number;
    customPrice: object | null;
    customDuration: number | null;
    service: {
        name: string;
        description: string | null;
        duration: number;
        price: object;
    };
}

export class OfferService {
    private offerRepository: OfferRepository;
    private professionalRepository: ProfessionalRepository;
    private serviceRepository: ServiceRepository;

    constructor(
        offerRepository: OfferRepository,
        professionalRepository: ProfessionalRepository,
        serviceRepository: ServiceRepository
    ) {
        this.offerRepository = offerRepository;
        this.professionalRepository = professionalRepository;
        this.serviceRepository = serviceRepository;
    }

    // Liste les services proposés par un professionnel
    async listByProfessional(professionalId: number): Promise<OfferItem[]> {
        await this.checkProfessionalExists(professionalId);

        const rows = await this.offerRepository.findByProfessional(professionalId);

        const result: OfferItem[] = [];
        for (const row of rows) {
            result.push(this.toOfferItem(row));
        }
        return result;
    }

    // Propose un service (ou modifie sa durée et son prix s'il est déjà proposé)
    async setOffer(professionalId: number, serviceId: number, data: SetOfferData): Promise<OfferItem> {
        await this.checkProfessionalExists(professionalId);

        // Règle métier : le service doit exister dans le catalogue
        const service = await this.serviceRepository.findById(serviceId);
        if (!service) {
            throw new NotFoundError("Service introuvable");
        }

        const row = await this.offerRepository.upsert(professionalId, serviceId, data.customPrice, data.customDuration);
        return this.toOfferItem(row);
    }

    // Retire un service de l'offre du professionnel
    async removeOffer(professionalId: number, serviceId: number) {
        const existing = await this.offerRepository.findOne(professionalId, serviceId);
        if (!existing) {
            throw new NotFoundError("Ce service n'est pas proposé par ce professionnel");
        }

        await this.offerRepository.delete(professionalId, serviceId);
        return { message: "Service retiré de votre offre" };
    }

    // Le compte professionnel peut avoir été supprimé alors que la session existe encore
    private async checkProfessionalExists(professionalId: number) {
        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional) {
            throw new NotFoundError("Professionnel introuvable");
        }
    }

    // Calcule le prix et la durée effectifs, et renvoie des nombres simples
    private toOfferItem(row: OfferRow): OfferItem {
        let price = Number(row.service.price);
        let customPrice: number | null = null;
        if (row.customPrice !== null) {
            customPrice = Number(row.customPrice);
            price = customPrice;
        }

        let duration = row.service.duration;
        if (row.customDuration !== null) {
            duration = row.customDuration;
        }

        return {
            serviceId: row.serviceId,
            name: row.service.name,
            description: row.service.description,
            price: price,
            duration: duration,
            customPrice: customPrice,
            customDuration: row.customDuration,
        };
    }
}