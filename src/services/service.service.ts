import { ServiceRepository } from "@/repositories/service.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { normalizeName } from "@/lib/text";
import { OfferItem } from "@/services/offer.service";

// On ne renvoie jamais plus de 10 suggestions
const MAX_SUGGESTIONS = 10;

// Données reçues pour créer un service
export interface CreateServiceInput {
    name: string;
    description?: string | null;
    duration: number;
    price: number;
}

// Une suggestion : un service existant dont le nom ressemble à la recherche
export interface ServiceSuggestion {
    id: number;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    exact: boolean;
}



// Forme d'un service tel que le repository le renvoie
interface ServiceRow {
    id: number;
    name: string;
    description: string | null;
    duration: number;
    price: object;
}

export class ServiceService {
    private serviceRepository: ServiceRepository;
    private professionalRepository: ProfessionalRepository;

    constructor(serviceRepository: ServiceRepository, professionalRepository: ProfessionalRepository) {
        this.serviceRepository = serviceRepository;
        this.professionalRepository = professionalRepository;
    }

    // Liste tout le catalogue
    async listAll() {
        return this.serviceRepository.findAll();
    }

    // Renvoie un service, ou une erreur 404 s'il n'existe pas
    async getById(id: number) {
        const service = await this.serviceRepository.findById(id);

        if (!service) {
            throw new NotFoundError("Service introuvable");
        }

        return service;
    }

    // Cherche les services dont le nom ressemble à ce qui est tapé.
    // Ordre : d'abord le nom identique, puis ceux qui commencent pareil, puis ceux qui contiennent la recherche.
    async suggest(name: string): Promise<ServiceSuggestion[]> {
        const query = normalizeName(name);
        const services = await this.serviceRepository.findAll();

        const exactMatches: ServiceSuggestion[] = [];
        const startMatches: ServiceSuggestion[] = [];
        const otherMatches: ServiceSuggestion[] = [];

        for (const service of services) {
            const serviceName = normalizeName(service.name);

            if (serviceName === query) {
                exactMatches.push(this.toSuggestion(service, true));
            } else if (serviceName.startsWith(query)) {
                startMatches.push(this.toSuggestion(service, false));
            } else if (serviceName.includes(query)) {
                otherMatches.push(this.toSuggestion(service, false));
            } else if (serviceName.length >= 3 && query.includes(serviceName)) {
                // La recherche est plus longue que le nom : "consultations" contient "consultation"
                otherMatches.push(this.toSuggestion(service, false));
            }
        }

        const result = exactMatches.concat(startMatches).concat(otherMatches);
        return result.slice(0, MAX_SUGGESTIONS);
    }

    // Un professionnel crée un service : il est ajouté au catalogue ET proposé par son créateur
    async create(professionalId: number, input: CreateServiceInput): Promise<OfferItem> {
        // Le compte professionnel peut avoir été supprimé alors que la session existe encore
        const professional = await this.professionalRepository.findById(professionalId);
        if (!professional) {
            throw new NotFoundError("Professionnel introuvable");
        }

        // Règle métier : pas deux services avec le même nom (sans tenir compte des accents, majuscules et espaces)
        const newName = normalizeName(input.name);
        const services = await this.serviceRepository.findAll();

        for (const existing of services) {
            if (normalizeName(existing.name) === newName) {
                throw new ConflictError(
                    "Ce service existe déjà : proposez-le au lieu d'en créer un nouveau",
                    ["serviceId : " + existing.id, "name : " + existing.name]
                );
            }
        }

        let description: string | null = null;
        if (input.description !== undefined && input.description !== null) {
            description = input.description;
        }

        // Le service et l'offre du créateur sont enregistrés ensemble (tout ou rien)
        const created = await this.serviceRepository.createWithOffer(
            { name: input.name, description: description, duration: input.duration, price: input.price },
            professionalId
        );

        // À la création, la durée et le prix du service sont aussi ceux de l'offre du créateur
        const price = Number(created.price);

        return {
            serviceId: created.id,
            name: created.name,
            description: created.description,
            price: price,
            duration: created.duration,
            customPrice: price,
            customDuration: created.duration,
        };
    }

    // Transforme un service de la base en suggestion (prix en nombre)
    private toSuggestion(row: ServiceRow, exact: boolean): ServiceSuggestion {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            duration: row.duration,
            price: Number(row.price),
            exact: exact,
        };
    }
} 