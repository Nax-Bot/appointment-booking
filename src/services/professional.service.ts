import { ProfessionalRepository, UpdateProfileData } from "@/repositories/professional.repository";
import { ServiceRepository } from "@/repositories/service.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { normalizeName } from "@/lib/text";

// Ce que l'on renvoie d'un professionnel (à plat, sans données privées)
export interface ProfessionalPublic {
    userId: number;
    firstName: string;
    lastName: string;
    specialty: string | null;
    description: string | null;
}

// Le service proposé par le professionnel, avec SA durée et SON prix
export interface ProfessionalOffer {
    serviceId: number;
    serviceName: string;
    price: number;
    duration: number;
}

// Un résultat de recherche : le professionnel, plus son offre si on a filtré par service (sinon null)
export interface ProfessionalSearchItem {
    userId: number;
    firstName: string;
    lastName: string;
    specialty: string | null;
    description: string | null;
    offer: ProfessionalOffer | null;
}

// Forme d'un professionnel tel que le repository le renvoie
interface ProfessionalRow {
    userId: number;
    description: string | null;
    specialty: string | null;
    user: { firstName: string; lastName: string };
}

// Forme d'une offre telle que le repository la renvoie pour la recherche
interface OfferSearchRow {
    customPrice: object | null;
    customDuration: number | null;
    service: { id: number; name: string; price: object; duration: number };
    professional: ProfessionalRow;
}

export class ProfessionalService {
    private professionalRepository: ProfessionalRepository;
    private serviceRepository: ServiceRepository;

    constructor(professionalRepository: ProfessionalRepository, serviceRepository: ServiceRepository) {
        this.professionalRepository = professionalRepository;
        this.serviceRepository = serviceRepository;
    }

    // Liste les professionnels, avec deux filtres facultatifs :
    // - serviceId : seulement ceux qui proposent ce service (le résultat contient alors leur offre)
    // - search : texte cherché dans le prénom, le nom et la spécialité
    async search(search: string | undefined, serviceId: number | undefined): Promise<ProfessionalSearchItem[]> {
        const items: ProfessionalSearchItem[] = [];

        if (serviceId === undefined) {
            // Pas de filtre de service : tous les professionnels, sans offre
            const rows = await this.professionalRepository.findAll();
            for (const row of rows) {
                items.push(this.toSearchItem(row, null));
            }
        } else {
            // Règle métier : le service doit exister
            const service = await this.serviceRepository.findById(serviceId);
            if (!service) {
                throw new NotFoundError("Service introuvable");
            }

            const offerRows: OfferSearchRow[] = await this.professionalRepository.findByService(serviceId);
            for (const offerRow of offerRows) {
                // Prix et durée effectifs : ceux de l'offre s'ils existent, sinon ceux du catalogue
                let price = Number(offerRow.service.price);
                if (offerRow.customPrice !== null) {
                    price = Number(offerRow.customPrice);
                }

                let duration = offerRow.service.duration;
                if (offerRow.customDuration !== null) {
                    duration = offerRow.customDuration;
                }

                const offer: ProfessionalOffer = {
                    serviceId: offerRow.service.id,
                    serviceName: offerRow.service.name,
                    price: price,
                    duration: duration,
                };
                items.push(this.toSearchItem(offerRow.professional, offer));
            }
        }

        // Pas de texte (ou texte vide) : on ne filtre pas
        if (search === undefined) {
            return items;
        }
        const words = this.splitWords(search);
        if (words.length === 0) {
            return items;
        }

        // On ne garde que les professionnels dont le nom ou la spécialité contiennent TOUS les mots
        const result: ProfessionalSearchItem[] = [];
        for (const item of items) {
            if (this.matchesAllWords(item, words)) {
                result.push(item);
            }
        }
        return result;
    }

    // Un professionnel, ou une erreur 404 s'il n'existe pas
    async getById(userId: number): Promise<ProfessionalPublic> {
        const row = await this.professionalRepository.findById(userId);

        if (!row) {
            throw new NotFoundError("Professionnel introuvable");
        }

        return this.toPublic(row);
    }

    // Modifie le profil du professionnel connecté
    async updateMyProfile(userId: number, data: UpdateProfileData): Promise<ProfessionalPublic> {
        // Règle métier : il faut envoyer au moins un champ à modifier
        if (data.description === undefined && data.specialty === undefined) {
            throw new ValidationError("Aucune donnée à modifier", []);
        }

        // Le compte peut avoir été supprimé alors que la session existe encore
        const existing = await this.professionalRepository.findById(userId);
        if (!existing) {
            throw new NotFoundError("Professionnel introuvable");
        }

        const updated = await this.professionalRepository.updateProfile(userId, data);
        return this.toPublic(updated);
    }

    // Nettoie le texte cherché (accents, majuscules, espaces) puis le découpe en mots
    private splitWords(text: string): string[] {
        const normalized = normalizeName(text);

        if (normalized === "") {
            return [];
        }

        return normalized.split(" ");
    }

    // Vrai si le prénom, le nom et la spécialité contiennent tous les mots, dans n'importe quel ordre
    private matchesAllWords(item: ProfessionalSearchItem, words: string[]): boolean {
        let specialty = "";
        if (item.specialty !== null) {
            specialty = item.specialty;
        }

        const haystack = normalizeName(item.firstName + " " + item.lastName + " " + specialty);

        for (const word of words) {
            if (haystack.includes(word) === false) {
                return false;
            }
        }
        return true;
    }

    // Met le professionnel à plat : nom et prénom au même niveau que le reste
    private toPublic(row: ProfessionalRow): ProfessionalPublic {
        return {
            userId: row.userId,
            firstName: row.user.firstName,
            lastName: row.user.lastName,
            specialty: row.specialty,
            description: row.description,
        };
    }

    // Met le professionnel à plat et lui joint son offre (ou null)
    private toSearchItem(row: ProfessionalRow, offer: ProfessionalOffer | null): ProfessionalSearchItem {
        return {
            userId: row.userId,
            firstName: row.user.firstName,
            lastName: row.user.lastName,
            specialty: row.specialty,
            description: row.description,
            offer: offer,
        };
    }
}