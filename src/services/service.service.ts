import { ServiceRepository } from "@/repositories/service.repository";
import { NotFoundError } from "@/lib/errors";

export class ServiceService {
    private serviceRepository: ServiceRepository;

    constructor(serviceRepository: ServiceRepository) {
        this.serviceRepository = serviceRepository;
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
}