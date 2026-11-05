import { ProfessionalService } from "@/services/professional.service";

import type { ProfessionalRepository } from "../../repositories/professional.repository";
import type { ServiceRepository } from "../../repositories/service.repository";
import { UpdateProfileData } from "../../repositories/professional.repository";

import { NotFoundError, ValidationError } from "../../lib/errors";
import { ProfessionalPublic, ProfessionalOffer, ProfessionalSearchItem } from "@/services/professional.service";

jest.mock("../../repositories/professional.repository", () => ({}));
jest.mock("../../repositories/service.repository", () => ({}));

type MockProfessionalRepository = {
    findAll: jest.Mock,
    findByService: jest.Mock,
    findById: jest.Mock,
    updateProfile: jest.Mock
}
type MockServiceRepository = {
    findAll: jest.Mock,
    findById: jest.Mock,
    createWithOffer: jest.Mock
}

let mockProfRepo: MockProfessionalRepository;
let mockServiceRepo: MockServiceRepository;

let profService: ProfessionalService;

// Output depuis la Repository 
function professionalRepoOutput() {
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

function professionalRepoOutputs() {
    return [
        {
            user: {
                lastName: "Nax",
                firstName: "Andry",
            },
            description: null,
            userId: 1,
            specialty: "Cardiologue",
        },
        {
            user: {
                lastName: "Ny Avo",
                firstName: "Andry",
            },
            description: null,
            userId: 2,
            specialty: "Dentiste",
        },
        {
            user: {
                lastName: "Ny Antsa",
                firstName: "Andrinirina",
            },
            description: null,
            userId: 3,
            specialty: "Pediatre",
        }
    ]
}

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

function makeServiceRowSeveral(
    id: number,
    name: string,
    duration: number,
    price: number,

) {
    return {
        id: id,
        name: name,
        duration: duration,
        price: price,
        description: null
    }
}
function makeProfRowSeveral(
    userId: number,
    specialty: string,
    lastName: string,
    firstName: string
) {
    return {
        user: {
            lastName: lastName,
            firstName: firstName,
        },
        description: null,
        userId: userId,
        specialty: specialty
    }
}

function offerSearchRows() {
    return [
        {
            customPrice: null,
            customDuration: null,
            service: makeServiceRow(),
            professional: makeProfRowSeveral(
                1, "Cardiologue", "Nax", "Andry"
            )
        },
        {
            customPrice: null,
            customDuration: null,
            service: makeServiceRow(),
            professional: makeProfRowSeveral(
                2, "Dentiste", "Ny Avo", "Andry"
            )
        },
        {
            customPrice: null,
            customDuration: null,
            service: makeServiceRow(),
            professional: makeProfRowSeveral(
                3, "Pediatre", "Ny Antsa", "Andrinirina"
            )
        }
    ]
}
// Output
function makeProfessional(): ProfessionalPublic {
    return {
        userId: 1,
        firstName: "Andry",
        lastName: "Nax",
        specialty: "Cardiologue",
        description: null
    }
}

function makeProfessionalOffer(): ProfessionalOffer {
    return {
        serviceId: 1,
        serviceName: "Consultation",
        price: 10000.00,
        duration: 30
    }
}

function makeProfessionalSearchItem(): ProfessionalSearchItem {
    return {
        userId: 1,
        firstName: "Andry",
        lastName: "Nax",
        specialty: "Cardiologue",
        description: null,
        offer: {
            serviceId: 1,
            serviceName: "Consultation",
            price: 10000.00,
            duration: 30
        }
    }
}


beforeEach(() => {
    jest.resetAllMocks();

    mockProfRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        findByService: jest.fn(),
        updateProfile: jest.fn()
    }

    mockServiceRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        createWithOffer: jest.fn()
    }

    profService = new ProfessionalService(
        mockProfRepo as unknown as ProfessionalRepository,
        mockServiceRepo as unknown as ServiceRepository
    );
})

describe("ProfessionalService.getById", () => {
    test("Renvoie un professionel s'il existe ", async () => {
        mockProfRepo.findById.mockResolvedValue(professionalRepoOutput());

        const result = await profService.getById(1);

        expect(result.userId).toBe(1);
        expect(result.specialty).toBe("Cardiologue");
    })

    test("Refuse si le professionel n'existe pas", async () => {
        mockProfRepo.findById.mockResolvedValue(null);
        await expect(profService.getById(999)).rejects.toThrow(NotFoundError);
    })
})

describe("ProfessionalService.updateMyProfile", () => {
    test("Renvoie le Professionel si les données modifier sont exactes", async () => {
        // ARRANGE
        // Input 
        const updateSpecialty: UpdateProfileData = {
            specialty: "Pediatre"
        }

        // Output de mockProfRepo.updateProfile
        const updateProfileOutput = {
            user: {
                lastName: "Nax",
                firstName: "Andry",
            },
            description: null,
            userId: 1,
            specialty: "Pediatre",
        }

        mockProfRepo.findById.mockResolvedValue(professionalRepoOutput);
        mockProfRepo.updateProfile.mockResolvedValue(updateProfileOutput)

        // ACT
        const result = await profService.updateMyProfile(1, updateSpecialty);

        // ASSERT
        expect(result).toEqual({
            userId: 1,
            firstName: "Andry",
            lastName: "Nax",
            specialty: "Pediatre",
            description: null
        })
    })

    test("Refuse la modification si aucune donnée inscrit ", async () => {
        // Input 
        const updateSpecialty: UpdateProfileData = {
        }

        expect(mockProfRepo.findById).not.toHaveBeenCalled();
        expect(mockProfRepo.updateProfile).not.toHaveBeenCalled();
        await expect(profService.updateMyProfile(1, updateSpecialty)).rejects.toThrow(ValidationError);
    })

    test("Refuse si le professionel n'existe pas ", async () => {
        // Input 
        const updateSpecialty: UpdateProfileData = {
            specialty: "Pediatre"
        }

        mockProfRepo.findById.mockResolvedValue(null);

        await expect(profService.updateMyProfile(999, updateSpecialty)).rejects.toThrow(NotFoundError);
    })
})

describe("ProfessionalService.search", () => {
    test("Renvoie les professionels par le service recherché", async () => {
        mockServiceRepo.findById.mockResolvedValue(makeServiceRow());
        mockProfRepo.findByService.mockResolvedValue(offerSearchRows());

        const result = await profService.search(undefined, 1);

        expect(result[0]).toEqual(
            {
                userId: 1,
                firstName: "Andry",
                lastName: "Nax",
                specialty: "Cardiologue",
                description: null,
                offer: {
                    serviceId: 1,
                    serviceName: "Consultation",
                    price: 10000.00,
                    duration: 30
                }
            }
        )
    })

    test("Renvoie tout les professsionels si le service n'est pas preciser", async () => {
        mockProfRepo.findAll.mockResolvedValue(professionalRepoOutputs());

        const result = await profService.search(undefined, undefined);

        expect(result[0]).toEqual(
            {
                userId: 1,
                firstName: "Andry",
                lastName: "Nax",
                specialty: "Cardiologue",
                description: null,
                offer: null
            }
        )
    })
    test("Refuse si le service inscrit est introuvable", async () => {
        mockServiceRepo.findById.mockResolvedValue(null);

        await expect(profService.search(undefined, 999)).rejects.toThrow(NotFoundError);
        expect(mockProfRepo.findByService).not.toHaveBeenCalled();
    })

    test("Filtrer par mot rechercher ", async () => {
        mockServiceRepo.findById.mockResolvedValue(makeServiceRow());
        mockProfRepo.findByService.mockResolvedValue(offerSearchRows());

        const result = await profService.search("Nax", 1);

        expect(result[0].lastName).toBe("Nax");
        expect(result[0].lastName).not.toBe("Ny Avo");
    })
})