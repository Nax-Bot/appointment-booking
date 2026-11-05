import { AvailabilityService, AvailabilityInput } from "../../services/availability.service";
import { AvailabilityRepository } from "../../repositories/availability.repository";
import { ProfessionalRepository } from "../../repositories/professional.repository";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";

jest.mock("../../repositories/availability.repository", () => ({}));
jest.mock("../../repositories/professional.repository", () => ({}));


type FakeRepository = Record<string, jest.Mock>;

let fakeAvailabilityRepository: FakeRepository;
let fakeProfessionalRepository: FakeRepository;
let availabilityService: AvailabilityService;

const PROFESSIONAL_ID = 5;

// Output Availability Repository
function makeRow(
    id: number,
    dayOfWeek: number,
    start: string,
    end: string,
    validFrom: string | null = null,
    validTo: string | null = null
) {
    let validFromDate: Date | null = null;
    if (validFrom !== null) {
        validFromDate = new Date(validFrom + "T00:00:00Z");
    }
    let validToDate: Date | null = null;
    if (validTo !== null) {
        validToDate = new Date(validTo + "T00:00:00Z");
    }
    return {
        id: id,
        dayOfWeek: dayOfWeek,
        startTime: new Date("1970-01-01T" + start + ":00.000Z"),
        endTime: new Date("1970-01-01T" + end + ":00.000Z"),
        validFrom: validFromDate,
        validTo: validToDate
    };
}

// Input Availability
function makeInput(
    start: string,
    end: string,
    validFrom: string | null = null,
    validTo: string | null = null,
    dayOfWeek: number = 1
): AvailabilityInput {
    return {
        dayOfWeek: dayOfWeek,
        startTime: start,
        endTime: end,
        validFrom: validFrom,
        validTo: validTo,
    }
}

beforeEach(() => {
    fakeProfessionalRepository = {
        findById: jest.fn().mockResolvedValue({ userId: PROFESSIONAL_ID }),
    };

    fakeAvailabilityRepository = {
        findByProfessional: jest.fn().mockResolvedValue([]),
        findByProfessionalAndDay: jest.fn().mockResolvedValue([]),
        findOwned: jest.fn(),
        // Le faux "enregistre" en renvoyant ce qu'il reçoit, avec un identifiant
        create: jest.fn().mockImplementation(async (professionalId: number, data: object) => ({
            id: 20,
            ...data,
        })),
        update: jest.fn().mockImplementation(async (id: number, data: object) => ({
            id: id,
            ...data,
        })),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    availabilityService = new AvailabilityService(
        fakeAvailabilityRepository as unknown as AvailabilityRepository,
        fakeProfessionalRepository as unknown as ProfessionalRepository
    );
});

describe("AvailabilityService.create", () => {
    test("cree une plage : renvoie des heures en texte et les enregistre sans conversion de fuseau horaire", async () => {
        const result = await availabilityService.create(
            PROFESSIONAL_ID,
            makeInput("08:00", "12:00", "2026-11-01", "2026-11-30")
        );

        expect(result).toEqual({
            id: 20,
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "12:00",
            validFrom: "2026-11-01",
            validTo: "2026-11-30"
        })

        expect(fakeAvailabilityRepository.create).toHaveBeenCalledWith(PROFESSIONAL_ID, {
            dayOfWeek: 1,
            startTime: new Date("1970-01-01T08:00:00.000Z"),
            endTime: new Date("1970-01-01T12:00:00.000Z"),
            validFrom: new Date("2026-11-01T00:00:00.000Z"),
            validTo: new Date("2026-11-30T00:00:00.000Z")
        });
    })

    test("met null quand il n'y a pas de date de validité", async () => {
        const result = await availabilityService.create(
            PROFESSIONAL_ID,
            makeInput("08:00", "12:00")
        );
        expect(result.validFrom).toBeNull();
        expect(result.validTo).toBeNull();
    })

    test("refuse un professionel inconnu", async () => {
        fakeProfessionalRepository.findById.mockResolvedValue(null);
        await expect(availabilityService.create(
            PROFESSIONAL_ID,
            makeInput("08:00", "12:00")
        )).rejects.toThrow(NotFoundError);
    })

    const endBeforeStartCases = [
        { name: "endTime avant startTime", start: "12:00", end: "08:00" }, // input: makeInput("12:00", "08:00") 
        { name: "endTime égal à startTime", start: "08:00", end: "08:00" }, // input: makeInput("08:00", "08:00")
    ];

    test.each(endBeforeStartCases)("refuse une fin qui n'est pas après le début: $name", async ({ start, end }) => {
        const input = makeInput(start, end);
        await expect(availabilityService.create(
            PROFESSIONAL_ID,
            input
        )).rejects.toThrow(ValidationError);
        expect(fakeAvailabilityRepository.create).not.toHaveBeenCalled();
    })

    test("refuse une date de validité invalide", async () => {
        const input = makeInput("08:00", "12:00", "2026-02-31", null);
        await expect(availabilityService.create(
            PROFESSIONAL_ID,
            input
        )).rejects.toThrow(ValidationError);
        expect(fakeAvailabilityRepository.create).not.toHaveBeenCalled();
    })

    test("refuse une date de validité invalide (validTo avant validFrom)", async () => {
        const input = makeInput("08:00", "12:00", "2026-11-30", "2026-11-01");
        await expect(availabilityService.create(
            PROFESSIONAL_ID,
            input
        )).rejects.toThrow(ValidationError);
        expect(fakeAvailabilityRepository.create).not.toHaveBeenCalled();
    })

    test("accepte une validité d'une seule journée (validFrom = validTo)", async () => {
        const input = makeInput("08:00", "12:00", "2026-11-01", "2026-11-01");
        await expect(availabilityService.create(
            PROFESSIONAL_ID,
            input
        )).resolves.toEqual({
            id: 20,
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "12:00",
            validFrom: "2026-11-01",
            validTo: "2026-11-01"
        });
    })

    // Une plage existe déjà : lundi 08:00-12:00, sans dates. On teste les heures de la nouvelle plage.
    const timeOverlapCases = [
        { name: "chevauchement partiel", start: "11:00", end: "13:00", conflict: true },
        { name: "incluse dans la plage existante", start: "09:00", end: "10:00", conflict: true },
        { name: "contient la plage existante", start: "07:00", end: "13:00", conflict: true },
        { name: "identique", start: "08:00", end: "12:00", conflict: true },
        { name: "se touchent à la fin (12:00)", start: "12:00", end: "14:00", conflict: false },
        { name: "se touchent au début (08:00)", start: "06:00", end: "08:00", conflict: false },
    ];

    test.each(timeOverlapCases)("plage existante 08:00-12:00, nouvelle plage : $name", async ({ start, end, conflict }) => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([makeRow(1, 1, "08:00", "12:00")]);

        if (conflict) {
            await expect(
                availabilityService.create(PROFESSIONAL_ID, makeInput(start, end))
            ).rejects.toThrow(ConflictError);
        } else {
            const result = await availabilityService.create(PROFESSIONAL_ID, makeInput(start, end));
            expect(result.startTime).toBe(start);
        }
    })

    // Une plage existe déjà : lundi 08:00-12:00, valable du 1er au 30 novembre.
    // La nouvelle plage a les MÊMES heures (09:00-10:00) : tout dépend de sa période de validité.
    const validityCases = [
        { name: "sans dates (active en permanence)", validFrom: null, validTo: null, conflict: true },
        { name: "en décembre, après la période existante", validFrom: "2026-12-01", validTo: "2026-12-31", conflict: false },
        { name: "en octobre, avant la période existante", validFrom: "2026-10-01", validTo: "2026-10-31", conflict: false },
        { name: "commence le dernier jour de la période existante", validFrom: "2026-11-30", validTo: "2026-12-31", conflict: true },
        { name: "commence en cours de période, sans fin", validFrom: "2026-11-15", validTo: null, conflict: true },
        { name: "finit avant la période existante, sans début", validFrom: null, validTo: "2026-10-31", conflict: false },
        { name: "commence après la période existante, sans fin", validFrom: "2026-12-01", validTo: null, conflict: false },
    ];

    test.each(validityCases)("heures identiques, période existante en novembre : $name", async ({ validFrom, validTo, conflict }) => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([
            makeRow(1, 1, "08:00", "12:00", "2026-11-01", "2026-11-30"),
        ]);
        const input = makeInput("09:00", "10:00", validFrom, validTo);

        if (conflict) {
            await expect(availabilityService.create(PROFESSIONAL_ID, input)).rejects.toThrow(ConflictError);
        } else {
            const result = await availabilityService.create(PROFESSIONAL_ID, input);
            expect(result.id).toBe(20);
        }
    });

    test("ne compare qu'avec les plages du même jour de la semaine", async () => {
        await availabilityService.create(PROFESSIONAL_ID, makeInput("08:00", "12:00", null, null, 2));

        expect(fakeAvailabilityRepository.findByProfessionalAndDay).toHaveBeenCalledWith(PROFESSIONAL_ID, 2);
    });
});

describe("AvailabilityService.update", () => {
  test("ne se compare pas à elle-même", async () => {
    const mine = makeRow(1, 1, "08:00", "12:00");
    fakeAvailabilityRepository.findOwned.mockResolvedValue(mine);
    fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([mine]);

    const result = await availabilityService.update(PROFESSIONAL_ID, 1, makeInput("08:00", "11:00"));

    expect(result.endTime).toBe("11:00");
    expect(fakeAvailabilityRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ dayOfWeek: 1 }));
  });

  test("refuse un chevauchement avec une autre plage", async () => {
    const mine = makeRow(1, 1, "08:00", "10:00");
    const other = makeRow(2, 1, "12:00", "14:00");
    fakeAvailabilityRepository.findOwned.mockResolvedValue(mine);
    fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([mine, other]);

    await expect(
      availabilityService.update(PROFESSIONAL_ID, 1, makeInput("09:00", "13:00"))
    ).rejects.toThrow(ConflictError);
    expect(fakeAvailabilityRepository.update).not.toHaveBeenCalled();
  });

  test("refuse de modifier la plage d'un autre professionnel", async () => {
    fakeAvailabilityRepository.findOwned.mockResolvedValue(null);

    await expect(
      availabilityService.update(PROFESSIONAL_ID, 99, makeInput("08:00", "12:00"))
    ).rejects.toThrow(NotFoundError);
    expect(fakeAvailabilityRepository.findOwned).toHaveBeenCalledWith(99, PROFESSIONAL_ID);
    expect(fakeAvailabilityRepository.update).not.toHaveBeenCalled();
  });
});

describe("AvailabilityService.remove", () => {
    test("supprime une plage qui appartient au professionnel", async () => {
        fakeAvailabilityRepository.findOwned.mockResolvedValue(makeRow(1, 1, "08:00", "12:00"));

        const result = await availabilityService.remove(PROFESSIONAL_ID, 1);

        expect(result).toEqual({ message: "Disponibilité supprimée" });
        expect(fakeAvailabilityRepository.delete).toHaveBeenCalledWith(1);
    });

    test("refuse de supprimer la plage d'un autre professionnel", async () => {
        fakeAvailabilityRepository.findOwned.mockResolvedValue(null);

        await expect(availabilityService.remove(PROFESSIONAL_ID, 99)).rejects.toThrow(NotFoundError);
        expect(fakeAvailabilityRepository.delete).not.toHaveBeenCalled();
    });
});

describe("AvailabilityService.listByProfessional", () => {
    test("renvoie les plages avec des heures en texte et des dates en texte ou null", async () => {
        fakeAvailabilityRepository.findByProfessional.mockResolvedValue([
            makeRow(1, 1, "08:00", "12:00", "2026-11-01", "2026-11-30"),
            makeRow(2, 2, "14:00", "18:00"),
        ]);

        const result = await availabilityService.listByProfessional(PROFESSIONAL_ID);

        expect(result).toEqual([
            { id: 1, dayOfWeek: 1, startTime: "08:00", endTime: "12:00", validFrom: "2026-11-01", validTo: "2026-11-30" },
            { id: 2, dayOfWeek: 2, startTime: "14:00", endTime: "18:00", validFrom: null, validTo: null },
        ]);
    });
});