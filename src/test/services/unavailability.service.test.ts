import { UnavailabilityService, UnavailabilityInput } from '../../services/unavailability.service';
import type { UnavailabilityRepository } from '../../repositories/unavailability.repository';
import type { ProfessionalRepository } from '../../repositories/professional.repository';

import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';

jest.mock('../../repositories/unavailability.repository', () => ({}));
jest.mock('../../repositories/professional.repository', () => ({}));

type FakeRepository = Record<string, jest.Mock>;

let fakeUnavailabilityRepository: FakeRepository;
let fakeProfessionalRepository: FakeRepository;
let unavailabilityService: UnavailabilityService;

const PROFESSIONAL_ID = 5;

// Une absence telle que la base la renvoie
function makeRow(id: number, start: string, end: string, reason: string | null = null) {
    return {
        id: id,
        startDatetime: new Date(start),
        endDatetime: new Date(end),
        reason: reason,
    };
}

// Les données reçues de l'API (dates ISO 8601 avec fuseau)
function makeInput(start: string, end: string, reason?: string | null): UnavailabilityInput {
    return { startDatetime: start, endDatetime: end, reason: reason };
}

beforeEach(() => {
    fakeProfessionalRepository = {
        findById: jest.fn().mockResolvedValue({ userId: PROFESSIONAL_ID }),
    };

    fakeUnavailabilityRepository = {
        findByProfessional: jest.fn().mockResolvedValue([]),
        findOverlapping: jest.fn().mockResolvedValue([]),
        findOwned: jest.fn(),
        create: jest.fn().mockImplementation(async (professionalId: number, data: object) => ({
            id: 30,
            ...data,
        })),
        update: jest.fn().mockImplementation(async (id: number, data: object) => ({
            id: id,
            ...data,
        })),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    unavailabilityService = new UnavailabilityService(
        fakeUnavailabilityRepository as unknown as UnavailabilityRepository,
        fakeProfessionalRepository as unknown as ProfessionalRepository
    );
});

describe("UnavailabilityService.create", () => {
    test("convertit les dates en UTC et renvoie des dates ISO", async () => {
        const result = await unavailabilityService.create(
            PROFESSIONAL_ID,
            makeInput("2026-11-10T08:00:00+03:00", "2026-11-10T18:00:00+03:00", "Congé")
        );

        expect(result).toEqual({
            id: 30,
            startDatetime: "2026-11-10T05:00:00.000Z",
            endDatetime: "2026-11-10T15:00:00.000Z",
            reason: "Congé",
        });
        expect(fakeUnavailabilityRepository.create).toHaveBeenCalledWith(PROFESSIONAL_ID, {
            startDatetime: new Date("2026-11-10T05:00:00.000Z"),
            endDatetime: new Date("2026-11-10T15:00:00.000Z"),
            reason: "Congé",
        });
    });

    const sameInstantCases = [
        { name: "heure de Madagascar (+03:00)", start: "2026-11-10T08:00:00+03:00", end: "2026-11-10T18:00:00+03:00" },
        { name: "heure UTC (Z)", start: "2026-11-10T05:00:00Z", end: "2026-11-10T15:00:00Z" },
    ];

    test.each(sameInstantCases)("la même absence écrite en $name donne les mêmes instants", async ({ start, end }) => {
        const result = await unavailabilityService.create(PROFESSIONAL_ID, makeInput(start, end));

        expect(result.startDatetime).toBe("2026-11-10T05:00:00.000Z");
        expect(result.endDatetime).toBe("2026-11-10T15:00:00.000Z");
    });

    test("met null quand il n'y a pas de raison", async () => {
        const result = await unavailabilityService.create(
            PROFESSIONAL_ID,
            makeInput("2026-11-10T08:00:00+03:00", "2026-11-10T18:00:00+03:00")
        );

        expect(result.reason).toBeNull();
    });

    test("refuse un professionnel inconnu", async () => {
        fakeProfessionalRepository.findById.mockResolvedValue(null);

        await expect(
            unavailabilityService.create(PROFESSIONAL_ID, makeInput("2026-11-10T08:00:00+03:00", "2026-11-10T18:00:00+03:00"))
        ).rejects.toThrow(NotFoundError);
    });

    const endBeforeStartCases = [
        { name: "fin avant le début", start: "2026-11-10T18:00:00+03:00", end: "2026-11-10T08:00:00+03:00" },
        { name: "fin égale au début", start: "2026-11-10T08:00:00+03:00", end: "2026-11-10T08:00:00+03:00" },
    ];

    test.each(endBeforeStartCases)("refuse une fin qui n'est pas après le début : $name", async ({ start, end }) => {
        await expect(
            unavailabilityService.create(PROFESSIONAL_ID, makeInput(start, end))
        ).rejects.toThrow(ValidationError);
        expect(fakeUnavailabilityRepository.create).not.toHaveBeenCalled();
    });

    test("refuse une absence qui chevauche une autre, en cherchant sur la bonne période", async () => {
        fakeUnavailabilityRepository.findOverlapping.mockResolvedValue([
            makeRow(1, "2026-11-10T06:00:00.000Z", "2026-11-10T09:00:00.000Z"),
        ]);

        await expect(
            unavailabilityService.create(
                PROFESSIONAL_ID,
                makeInput("2026-11-10T08:00:00+03:00", "2026-11-10T18:00:00+03:00")
            )
        ).rejects.toThrow(ConflictError);

        expect(fakeUnavailabilityRepository.findOverlapping).toHaveBeenCalledWith(
            PROFESSIONAL_ID,
            new Date("2026-11-10T05:00:00.000Z"),
            new Date("2026-11-10T15:00:00.000Z")
        );
        expect(fakeUnavailabilityRepository.create).not.toHaveBeenCalled();
    });
});

describe("UnavailabilityService.update", () => {
    const start = "2026-11-10T08:00:00+03:00";
    const end = "2026-11-10T18:00:00+03:00";

    test("ne se compare pas à elle-même", async () => {
        const mine = makeRow(1, "2026-11-10T05:00:00.000Z", "2026-11-10T15:00:00.000Z");
        fakeUnavailabilityRepository.findOwned.mockResolvedValue(mine);
        fakeUnavailabilityRepository.findOverlapping.mockResolvedValue([mine]);

        const result = await unavailabilityService.update(PROFESSIONAL_ID, 1, makeInput(start, end, "Nouvelle raison"));

        expect(result.reason).toBe("Nouvelle raison");
        expect(fakeUnavailabilityRepository.update).toHaveBeenCalledTimes(1);
    });

    test("refuse un chevauchement avec une autre absence", async () => {
        const mine = makeRow(1, "2026-11-10T05:00:00.000Z", "2026-11-10T15:00:00.000Z");
        const other = makeRow(2, "2026-11-10T14:00:00.000Z", "2026-11-10T20:00:00.000Z");
        fakeUnavailabilityRepository.findOwned.mockResolvedValue(mine);
        fakeUnavailabilityRepository.findOverlapping.mockResolvedValue([mine, other]);

        await expect(
            unavailabilityService.update(PROFESSIONAL_ID, 1, makeInput(start, end))
        ).rejects.toThrow(ConflictError);
        expect(fakeUnavailabilityRepository.update).not.toHaveBeenCalled();
    });

    test("refuse de modifier l'absence d'un autre professionnel", async () => {
        fakeUnavailabilityRepository.findOwned.mockResolvedValue(null);

        await expect(
            unavailabilityService.update(PROFESSIONAL_ID, 99, makeInput(start, end))
        ).rejects.toThrow(NotFoundError);
        expect(fakeUnavailabilityRepository.findOwned).toHaveBeenCalledWith(99, PROFESSIONAL_ID);
    });
});

describe("UnavailabilityService.remove", () => {
    test("supprime une absence qui appartient au professionnel", async () => {
        fakeUnavailabilityRepository.findOwned.mockResolvedValue(
            makeRow(1, "2026-11-10T05:00:00.000Z", "2026-11-10T15:00:00.000Z")
        );

        const result = await unavailabilityService.remove(PROFESSIONAL_ID, 1);

        expect(result).toEqual({ message: "Indisponibilité supprimée" });
        expect(fakeUnavailabilityRepository.delete).toHaveBeenCalledWith(1);
    });

    test("refuse de supprimer l'absence d'un autre professionnel", async () => {
        fakeUnavailabilityRepository.findOwned.mockResolvedValue(null);

        await expect(unavailabilityService.remove(PROFESSIONAL_ID, 99)).rejects.toThrow(NotFoundError);
        expect(fakeUnavailabilityRepository.delete).not.toHaveBeenCalled();
    });
});

describe("UnavailabilityService.listByProfessional", () => {
    test("renvoie les absences avec des dates ISO et la raison ou null", async () => {
        fakeUnavailabilityRepository.findByProfessional.mockResolvedValue([
            makeRow(1, "2026-11-10T05:00:00.000Z", "2026-11-10T15:00:00.000Z", "Congé"),
            makeRow(2, "2026-12-24T00:00:00.000Z", "2026-12-26T00:00:00.000Z"),
        ]);

        const result = await unavailabilityService.listByProfessional(PROFESSIONAL_ID);

        expect(result).toEqual([
            { id: 1, startDatetime: "2026-11-10T05:00:00.000Z", endDatetime: "2026-11-10T15:00:00.000Z", reason: "Congé" },
            { id: 2, startDatetime: "2026-12-24T00:00:00.000Z", endDatetime: "2026-12-26T00:00:00.000Z", reason: null },
        ]);
    });
});