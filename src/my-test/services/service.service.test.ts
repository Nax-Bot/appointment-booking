import { ServiceService, CreateServiceInput, ServiceSuggestion } from "../../services/service.service";

import type { ServiceRepository } from "../../repositories/service.repository";
import type { ProfessionalRepository } from "../../repositories/professional.repository";
import { ConflictError, NotFoundError } from "../../lib/errors";

import { OfferItem } from "../../services/offer.service";

// On mock les modules 
jest.mock("../../repositories/professional.repository", () => ({}));
jest.mock("../../repositories/service.repository", () => ({}));

// On defini un type TypeScript pour decrire la forme du mock
// Pour avoir un meilleur autocompletion + securite de type dans les tests
type MockServiceRepository = {
    findAll: jest.Mock,
    findById: jest.Mock,
    createWithOffer: jest.Mock
}
type MockProfessionalRepository = {
    findAll: jest.Mock,
    findByService: jest.Mock,
    findById: jest.Mock,
    updateProfile: jest.Mock
}

let mockServiceRepo: MockServiceRepository;
let mockProfRepo: MockProfessionalRepository;

let serviceServ: ServiceService;

function makeServiceRow() {
    return {
        id: 1,
        name: "Consultation",
        duration: 30,
        price: 10000.00,
        description: null
    }
}

function makeProfRow() {
    return {
        user: {
            lastName: "Andry",
            firstName: "Nax",
        },
        description: null,
        userId: 1,
        specialty: "Docteur"
    }
}

function serviceSuggestionRow(exact: boolean): ServiceSuggestion {
    return {
        id: 1,
        name: "Consultation",
        duration: 30,
        price: 10000.00,
        description: null,
        exact: exact
    }
}

function makeServiceRows() {
    return [
        {
            id: 2,
            name: "Pointage",
            duration: 30,
            price: 10000.00,
            description: null
        },
        {
            id: 3,
            name: "Suivi",
            duration: 60,
            price: 20000.00,
            description: null
        }
    ]
}

const serviceInput: CreateServiceInput = {
    name: "Consultation",
    duration: 30,
    price: 10000.00
}

const serviceInputOffer: CreateServiceInput = {
    name: "Suivi",
    duration: 60,
    price: 20000.00
}
// Attend en argument un callback
beforeEach(() => {
    jest.resetAllMocks();

    // On mock chaque methode des differents Repository
    mockServiceRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        createWithOffer: jest.fn()
    };

    mockProfRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        findByService: jest.fn(),
        updateProfile: jest.fn()
    }

    serviceServ = new ServiceService(
        mockServiceRepo as unknown as ServiceRepository,
        mockProfRepo as unknown as ProfessionalRepository
    );
})


describe("ServiceService.getByID", () => {
    test("Renvoie une service s'il existe", async () => {
        mockServiceRepo.findById.mockResolvedValue(makeServiceRow());

        const result = await serviceServ.getById(1);

        expect(result.id).toBe(1);
        expect(result.description).toBe(null);
        expect(result.name).toBe("Consultation");
    })

    test("Renvoie une erreur si le service n'existe pas", async () => {
        mockServiceRepo.findById.mockResolvedValue(null);

        await expect(serviceServ.getById(999)).rejects.toThrow(NotFoundError);
    })
})

describe("ServiceService.create", () => {
    test("Ajoute une service et renvoie son id", async () => {
        // mockResolvedValue est destine au promise
        mockProfRepo.findById.mockResolvedValue(makeProfRow());
        mockServiceRepo.findAll.mockResolvedValue(makeServiceRows());

        mockServiceRepo.createWithOffer.mockResolvedValue(makeServiceRow());

        const result = await serviceServ.create(1, serviceInput);

        expect(result.serviceId).toBe(1);
        expect(result.price).toBe(10000.00);
        expect(result.name).toBe("Consultation");
    })

    test("Refuse si l'utilisateur [PROFESSIONAL] n'existe pas, la creation ne s'execute", async () => {
        mockProfRepo.findById.mockResolvedValue(null);

        await expect(serviceServ.create(999, serviceInput)).rejects.toThrow(NotFoundError);

        expect(mockServiceRepo.findAll).not.toHaveBeenCalled();
        expect(mockServiceRepo.createWithOffer).not.toHaveBeenCalled();
    })

    test("Proposer le service s'il est deja offert dans le catalogue", async () => {
        mockProfRepo.findById.mockResolvedValue(makeProfRow());
        mockServiceRepo.findAll.mockResolvedValue(makeServiceRows());

        await expect(serviceServ.create(1, serviceInputOffer)).rejects.toThrow(ConflictError);
        expect(mockServiceRepo.findAll).toHaveBeenCalled();
        expect(mockServiceRepo.createWithOffer).not.toHaveBeenCalled();
    })

    test("Recupere la description si fourni", async () => {
        mockProfRepo.findById.mockResolvedValue(makeProfRow());
        mockServiceRepo.findAll.mockResolvedValue(makeServiceRows());
        mockServiceRepo.createWithOffer.mockResolvedValue(makeServiceRow());

        await serviceServ.create(1, {
            ...serviceInput,
            description: "Pour douleur epigastriques"
        })

        expect(mockServiceRepo.createWithOffer).toHaveBeenCalledWith(
            expect.objectContaining({
                description: "Pour douleur epigastriques"
            }), 1
        )
    })

    test("Traite une description vide comme absent", async () => {
        mockProfRepo.findById.mockResolvedValue(makeProfRow());
        mockServiceRepo.findAll.mockResolvedValue(makeServiceRows());
        mockServiceRepo.createWithOffer.mockResolvedValue(makeServiceRow());

        await serviceServ.create(1, {
            ...serviceInput,
            description: ""
        })

        expect(mockServiceRepo.createWithOffer).toHaveBeenCalledWith(
            expect.objectContaining({
                description: null
            }), 1
        )
    })
})

describe("ServiceService.suggest", () => {
    test("Suggerer le nom ", async () => {
        const mockServices = [
            { id: 1, name: "consultation", price: 10000.00 },
            { id: 1, name: "consultation cardio", price: 10000.00 },
            { id: 1, name: "consultations", price: 10000.00 }
        ]
        mockServiceRepo.findAll.mockResolvedValue(mockServices);

        const result = await serviceServ.suggest("Consultation");

        expect(result).toHaveLength(3);
        // Exact name
        expect(result[0].name).toBe("consultation");
        expect(result[0].exact).toBe(true);

        // Start name
        expect(result[1].name).toBe("consultation cardio");
        expect(result[1].exact).toBe(false);

        // Include name
        expect(result[2].name).toBe("consultations");
        expect(result[2].exact).toBe(false);

    })
})