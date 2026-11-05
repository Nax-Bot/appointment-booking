import { SlotService, SlotsResult } from "../../services/slot.service";

import type { ProfessionalRepository } from "../../repositories/professional.repository";
import type { OfferRepository } from "../../repositories/offer.repository";
import type { AvailabilityRepository } from "../../repositories/availability.repository";
import type { UnavailabilityRepository } from "../../repositories/unavailability.repository";
import type { AppointmentRepository } from "../../repositories/appointment.repository";

import { NotFoundError, ValidationError } from "../../lib/errors";

jest.mock("../../repositories/professional.repository", () => ({}));
jest.mock("../../repositories/offer.repository", () => ({}));
jest.mock("../../repositories/availability.repository", () => ({}));
jest.mock("../../repositories/unavailability.repository", () => ({}));
jest.mock("../../repositories/appointment.repository", () => ({}));

type FakeRepository = Record<string, jest.Mock>;

let fakeProfessionalRepository: FakeRepository;
let fakeOfferRepository: FakeRepository;
let fakeAvailabilityRepository: FakeRepository;
let fakeUnavailabilityRepository: FakeRepository;
let fakeAppointmentRepository: FakeRepository;
let slotService: SlotService;

// "Maintenant" : mercredi 28 octobre 2026, 09:00 UTC
const NOW = new Date("2026-10-28T09:00:00.000Z").getTime();

const PROFESSIONAL_ID = 5;
const SERVICE_ID = 3;
const MONDAY = "2026-11-09";

// Une offre : le service dure 30 minutes et coûte 30000 au catalogue
function makeOffer(customPrice: number | null = null, customDuration: number | null = null) {
    return {
        serviceId: SERVICE_ID,
        customPrice: customPrice,
        customDuration: customDuration,
        service: {
            id: SERVICE_ID,
            name: "Consultation générale",
            description: null,
            duration: 30,
            price: 30000,
        },
    };
}

// Une plage de travail avec une période de validité facultative
function makeAvailability(
    start: string,
    end: string,
    validFrom: string | null = null,
    validTo: string | null = null
) {
    let validFromDate: Date | null = null;
    if (validFrom !== null) {
        validFromDate = new Date(validFrom + "T00:00:00.000Z");
    }

    let validToDate: Date | null = null;
    if (validTo !== null) {
        validToDate = new Date(validTo + "T00:00:00.000Z");
    }

    return {
        id: 1,
        dayOfWeek: 1,
        startTime: new Date("1970-01-01T" + start + ":00.000Z"),
        endTime: new Date("1970-01-01T" + end + ":00.000Z"),
        validFrom: validFromDate,
        validTo: validToDate,
    };
}

// Demande les créneaux du professionnel 5 pour le service 3 (par défaut le lundi 9 novembre)
function askSlots(dateText: string = MONDAY) {
    return slotService.getSlots(PROFESSIONAL_ID, SERVICE_ID, dateText);
}

// La liste des heures de début (en heure locale) d'un résultat : ["08:00", "08:15", ...]
function startTimesOf(result: SlotsResult): string[] {
    const times: string[] = [];
    for (const slot of result.slots) {
        times.push(slot.startTime);
    }
    return times;
}

beforeEach(() => {
    // On fige l'horloge
    jest.spyOn(Date, "now").mockReturnValue(NOW);

    // Par défaut : le professionnel existe, propose le service, travaille de 08:00 à 12:00, rien n'est pris
    fakeProfessionalRepository = {
        findById: jest.fn().mockResolvedValue({ userId: PROFESSIONAL_ID }),
    };
    fakeOfferRepository = {
        findOne: jest.fn().mockResolvedValue(makeOffer()),
    };
    fakeAvailabilityRepository = {
        findByProfessionalAndDay: jest.fn().mockResolvedValue([makeAvailability("08:00", "12:00")]),
    };
    fakeUnavailabilityRepository = {
        findOverlapping: jest.fn().mockResolvedValue([]),
    };
    fakeAppointmentRepository = {
        findOverlapping: jest.fn().mockResolvedValue([]),
    };

    slotService = new SlotService(
        fakeProfessionalRepository as unknown as ProfessionalRepository,
        fakeOfferRepository as unknown as OfferRepository,
        fakeAvailabilityRepository as unknown as AvailabilityRepository,
        fakeUnavailabilityRepository as unknown as UnavailabilityRepository,
        fakeAppointmentRepository as unknown as AppointmentRepository
    );
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("SlotService.getSlots : les créneaux d'une journée", () => {
    test("propose un créneau toutes les 15 minutes, de l'ouverture à la dernière fin possible", async () => {
        const result = await askSlots();
        const times = startTimesOf(result);

        expect(times.length).toBe(15);
        expect(times[0]).toBe("08:00");
        expect(times[times.length - 1]).toBe("11:30");
        expect(result.slots[0]).toEqual({
            startDatetime: "2026-11-09T05:00:00.000Z",
            endDatetime: "2026-11-09T05:30:00.000Z",
            startTime: "08:00",
            endTime: "08:30",
        });
    });

    test("renvoie la durée et le prix effectifs du service", async () => {
        const result = await askSlots();

        expect(result).toMatchObject({
            professionalId: 5,
            serviceId: 3,
            date: "2026-11-09",
            duration: 30,
            price: 30000,
        });
    });

    test("utilise la durée et le prix personnalisés de l'offre", async () => {
        fakeOfferRepository.findOne.mockResolvedValue(makeOffer(70000, 45));

        const result = await askSlots();
        const times = startTimesOf(result);

        expect(result.duration).toBe(45);
        expect(result.price).toBe(70000);
        expect(times.length).toBe(14);
        expect(times[times.length - 1]).toBe("11:15");
        expect(result.slots[0].endTime).toBe("08:45");
    });

    test("fusionne les plages qui se touchent : des créneaux passent par-dessus midi", async () => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([
            makeAvailability("08:00", "12:00"),
            makeAvailability("12:00", "14:00"),
        ]);

        const times = startTimesOf(await askSlots());

        expect(times.length).toBe(23);
        expect(times).toContain("11:45");
        expect(times).toContain("12:00");
        expect(times[times.length - 1]).toBe("13:30");
    });

    test("laisse un trou pendant la pause déjeuner", async () => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([
            makeAvailability("08:00", "12:00"),
            makeAvailability("14:00", "18:00"),
        ]);

        const times = startTimesOf(await askSlots());

        expect(times).toContain("11:30");
        expect(times).not.toContain("11:45");
        expect(times).not.toContain("12:00");
        expect(times).not.toContain("13:45");
        expect(times).toContain("14:00");
        expect(times[times.length - 1]).toBe("17:30");
    });

    test("renvoie une liste vide, sans erreur, quand le professionnel ne travaille pas ce jour-là", async () => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([]);

        const result = await askSlots();

        expect(result.slots).toEqual([]);
        expect(result.duration).toBe(30);
    });

    // Une plage de lundi 08:00-12:00, avec une période de validité
    const validityCases = [
        { name: "valable jusqu'au jour même", validFrom: null, validTo: "2026-11-09", count: 15 },
        { name: "expirée la veille", validFrom: null, validTo: "2026-11-08", count: 0 },
        { name: "qui ne commence que le lendemain", validFrom: "2026-11-10", validTo: null, count: 0 },
    ];

    test.each(validityCases)("plage $name", async ({ validFrom, validTo, count }) => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([
            makeAvailability("08:00", "12:00", validFrom, validTo),
        ]);

        const result = await askSlots();

        expect(result.slots.length).toBe(count);
    });
});

describe("SlotService.getSlots : périodes occupées et passé", () => {
    test("retire les créneaux qui chevauchent une absence", async () => {
        // Absence de 10:00 à 11:00 heure locale = 07:00 à 08:00 UTC
        fakeUnavailabilityRepository.findOverlapping.mockResolvedValue([
            {
                startDatetime: new Date("2026-11-09T07:00:00.000Z"),
                endDatetime: new Date("2026-11-09T08:00:00.000Z"),
            },
        ]);

        const times = startTimesOf(await askSlots());

        expect(times.length).toBe(10);
        expect(times).toContain("09:30"); // finit à 10:00, touche l'absence sans la chevaucher
        expect(times).not.toContain("09:45");
        expect(times).not.toContain("10:00");
        expect(times).not.toContain("10:15");
        expect(times).not.toContain("10:30");
        expect(times).not.toContain("10:45");
        expect(times).toContain("11:00"); // commence quand l'absence finit
    });

    test("retire les créneaux qui chevauchent un rendez-vous déjà pris", async () => {
        // Rendez-vous de 09:00 à 09:30 heure locale = 06:00 à 06:30 UTC
        fakeAppointmentRepository.findOverlapping.mockResolvedValue([
            {
                startDatetime: new Date("2026-11-09T06:00:00.000Z"),
                endDatetime: new Date("2026-11-09T06:30:00.000Z"),
            },
        ]);

        const times = startTimesOf(await askSlots());

        expect(times.length).toBe(12);
        expect(times).toContain("08:30");
        expect(times).not.toContain("08:45");
        expect(times).not.toContain("09:00");
        expect(times).not.toContain("09:15");
        expect(times).toContain("09:30");
    });

    test("ne propose pas les créneaux déjà passés", async () => {
        // Il est 10:07 à Madagascar ce lundi (07:07 UTC)
        jest.mocked(Date.now).mockReturnValue(new Date("2026-11-09T07:07:00.000Z").getTime());

        const times = startTimesOf(await askSlots());

        expect(times[0]).toBe("10:15");
        expect(times.length).toBe(6);
    });

    test("ne propose pas un créneau qui commence exactement maintenant", async () => {
        // Il est exactement 10:15 à Madagascar (07:15 UTC)
        jest.mocked(Date.now).mockReturnValue(new Date("2026-11-09T07:15:00.000Z").getTime());

        const times = startTimesOf(await askSlots());

        expect(times[0]).toBe("10:30");
    });

    test("ne propose rien pour un jour entièrement passé", async () => {
        jest.mocked(Date.now).mockReturnValue(new Date("2026-11-10T00:00:00.000Z").getTime());

        const result = await askSlots();

        expect(result.slots).toEqual([]);
    });
});

describe("SlotService.getSlots : erreurs et conversion du jour local", () => {
    test("refuse une date qui n'existe pas", async () => {
        await expect(askSlots("2026-02-31")).rejects.toThrow(ValidationError);
    });

    test("refuse un professionnel inconnu", async () => {
        fakeProfessionalRepository.findById.mockResolvedValue(null);

        await expect(askSlots()).rejects.toThrow(NotFoundError);
    });

    test("refuse un service que le professionnel ne propose pas", async () => {
        fakeOfferRepository.findOne.mockResolvedValue(null);

        await expect(askSlots()).rejects.toThrow(NotFoundError);
    });

    const dayOfWeekCases = [
        { name: "lundi", date: "2026-11-09", day: 1 },
        { name: "dimanche", date: "2026-11-08", day: 0 },
        { name: "samedi", date: "2026-11-14", day: 6 },
    ];

    test.each(dayOfWeekCases)("cherche les plages du bon jour de la semaine ($name)", async ({ date, day }) => {
        await askSlots(date);

        expect(fakeAvailabilityRepository.findByProfessionalAndDay).toHaveBeenCalledWith(PROFESSIONAL_ID, day);
    });

    test("cherche les périodes occupées entre minuit local et minuit local suivant, en UTC", async () => {
        await askSlots();

        const dayStart = new Date("2026-11-08T21:00:00.000Z");
        const dayEnd = new Date("2026-11-09T21:00:00.000Z");
        expect(fakeUnavailabilityRepository.findOverlapping).toHaveBeenCalledWith(PROFESSIONAL_ID, dayStart, dayEnd);
        expect(fakeAppointmentRepository.findOverlapping).toHaveBeenCalledWith(PROFESSIONAL_ID, dayStart, dayEnd);
    });
});