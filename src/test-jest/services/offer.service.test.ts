import { OfferService, SetOfferData } from "@/services/offer.service";

import type { OfferRepository } from "../../repositories/offer.repository";
import type { ProfessionalRepository } from "../../repositories/professional.repository";
import type { ServiceRepository } from "../../repositories/service.repository";

import { NotFoundError } from "../../lib/errors";

jest.mock("../../repositories/offer.repository", () => ({}));
jest.mock("../../repositories/professional.repository", () => ({}));
jest.mock("../../repositories/service.repository", () => ({}));

type mockOfferRepository = {
    findByProfessional: jest.Mock,
    findOne: jest.Mock,
    upsert: jest.Mock,
    delete: jest.Mock
}
type mockProfRepository = {
    findAll: jest.Mock,
    findByService: jest.Mock,
    findById: jest.Mock,
    updateProfile: jest.Mock
}
type mockServiceRepository = {
    findAll: jest.Mock,
    findById: jest.Mock,
    createWithOffer: jest.Mock
}

let mockOfferRepo: mockOfferRepository;
let mockProfRepo: mockProfRepository;
let mockServiceRepo: mockServiceRepository;

let offerService: OfferService;

// Output Professional Repository
function makeProfessionalRow() {
    return {
        user: {
            lastName: "Nax",
            firstName: "Andry",
        },
        description: null,
        userId: 1,
        specialty: "Cardiologue",
    }
}

function makeServiceRow() {
    return {
        name: "Consultation",
        description: null,
        duration: 30,
        price: 10000.00,
    }
}

function makeOfferRowId() {
    return {
        id: 1,
        name: "Consultation",
        description: null,
        duration: 30,
        price: 10000.00,
    }
}
function makeServiceRowSeveral(
    name: string,
    duration: number,
    price: number
) {
    return {
        name: name,
        description: null,
        duration: duration,
        price: price
    }
}

function makeOffer() {
    return {
        professionalId: 1,
        serviceId: 1,
        customPrice: null,
        customDuration: null,
    }
}
function makeOfferRow() {
    return {
        serviceId: 1,
        customPrice: null,
        customDuration: null,
        service: makeServiceRow()
    }
}
function makeOfferRowUpsert(customPrice: number | null,
    customDuration: number | null
) {
    return {

        serviceId: 1,
        customPrice: customPrice,
        customDuration: customDuration,
        service: makeServiceRow()
    }
}

function makeOfferRows() {
    return [
        {
            serviceId: 1,
            customPrice: null,
            customDuration: null,
            service: makeServiceRowSeveral(
                "Consultation",
                30,
                10000.00
            )
        }, {
            serviceId: 2,
            customPrice: null,
            customDuration: null,
            service: makeServiceRowSeveral(
                "Suivi",
                60,
                20000.00
            )
        }, {
            serviceId: 3,
            customPrice: null,
            customDuration: null,
            service: makeServiceRowSeveral(
                "Test",
                45,
                30000.00
            )
        }
    ]
}

beforeEach(() => {
    jest.resetAllMocks();

    mockProfRepo = {
        findAll: jest.fn(),
        findByService: jest.fn(),
        findById: jest.fn(),
        updateProfile: jest.fn()
    }

    mockOfferRepo = {
        findByProfessional: jest.fn(),
        findOne: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn()
    }
    mockServiceRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        createWithOffer: jest.fn()
    }

    offerService = new OfferService(
        mockOfferRepo as unknown as OfferRepository,
        mockProfRepo as unknown as ProfessionalRepository,
        mockServiceRepo as unknown as ServiceRepository
    )
})

describe("OfferService.listProfessional", () => {
    test("Renvoie les services proposé par un professionel s'il existe", async () => {
        mockProfRepo.findById.mockResolvedValue(makeProfessionalRow());
        mockOfferRepo.findByProfessional.mockResolvedValue(makeOfferRows());

        const result = await offerService.listByProfessional(1);

        expect(result[0]).toEqual({
            serviceId: 1,
            name: "Consultation",
            description: null,
            price: 10000.00,
            duration: 30,
            customPrice: null,
            customDuration: null,
        })
    })
    test("Refuse si le professionel inscrit n'existe pas", async () => {
        mockProfRepo.findById.mockResolvedValue(null);

        await expect(offerService.listByProfessional(999)).rejects.toThrow(NotFoundError);

        expect(mockOfferRepo.findByProfessional).not.toHaveBeenCalled();

    })
    test("Renvoie aucune service si le professionel n'en a encore rien declaré", async () => {
        mockProfRepo.findById.mockResolvedValue(makeProfessionalRow());
        mockOfferRepo.findByProfessional.mockResolvedValue(null);

        const result = await offerService.listByProfessional(1);

        expect(result).toHaveLength(0);
    })
})

describe("OfferService.removeOffer", () => {
    test("Retire un service de l'offre du professionel", async () => {
        mockOfferRepo.findOne.mockResolvedValue(makeOfferRowId());
        mockOfferRepo.delete.mockResolvedValue(makeOffer());

        const result = await offerService.removeOffer(1, 1);

        expect(result.message).toBe("Service retiré de votre offre");
    })

    test("Refuse si le service n'est pas l'offre du professionel ou celle ci n'a jamais ete declarer par lui", async () => {
        mockOfferRepo.findOne.mockResolvedValue(null);

        await expect(offerService.removeOffer(1, 999)).rejects.toThrow(NotFoundError);
    })
})

describe("OfferService.setOffer", () => {
    test("Propose le service du Professionel avec son etat natif", async () => {
        const data: SetOfferData = {
            customPrice: null,
            customDuration: null,

        }
        mockProfRepo.findById.mockResolvedValue(makeProfessionalRow());
        mockServiceRepo.findById.mockResolvedValue(makeOfferRowId());

        mockOfferRepo.upsert.mockResolvedValue(makeOfferRowUpsert(
            data.customPrice,
            data.customDuration
        ));

        const result = await offerService.setOffer(1, 1, data);

        expect(result.price).toBe(10000.00);
        expect(result.customPrice).toBeNull();
    })

    test("Propose le service du Professionel avec la personnalisation des prix et du durée", async () => {
        const data: SetOfferData = {
            customPrice: 20000.00,
            customDuration: 60,
        }
        mockProfRepo.findById.mockResolvedValue(makeProfessionalRow());
        mockServiceRepo.findById.mockResolvedValue(makeOfferRowId());
        mockOfferRepo.upsert.mockResolvedValue(makeOfferRowUpsert(
            data.customPrice,
            data.customDuration
        ));

        const result = await offerService.setOffer(1, 1, data);

        expect(result.price).toBe(20000.00);
        expect(result.customPrice).toBe(20000.00);
        expect(result.duration).toBe(60);
        expect(result.customDuration).toBe(60);
    })
})