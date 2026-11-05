import { AppointmentService, CreateAppointmentInput } from "../../services/appointment.service";
import type { AppointmentRepository } from "../../repositories/appointment.repository";
import type { ProfessionalRepository } from "../../repositories/professional.repository";
import type { OfferRepository } from "../../repositories/offer.repository";
import type { AvailabilityRepository } from "../../repositories/availability.repository";
import type { UnavailabilityRepository } from "../../repositories/unavailability.repository";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";

// On ne charge jamais les vrais repositories (ni Prisma) ni lib/auth
jest.mock("../../repositories/appointment.repository", () => ({}));
jest.mock("../../repositories/professional.repository", () => ({}));
jest.mock("../../repositories/offer.repository", () => ({}));
jest.mock("../../repositories/availability.repository", () => ({}));
jest.mock("../../repositories/unavailability.repository", () => ({}));
jest.mock("../../lib/auth", () => ({}));

// Un faux repository : un objet dont chaque propriété est une fonction espionne
type FakeRepository = Record<string, jest.Mock>;

let fakeAppointmentRepository: FakeRepository;
let fakeProfessionalRepository: FakeRepository;
let fakeOfferRepository: FakeRepository;
let fakeAvailabilityRepository: FakeRepository;
let fakeUnavailabilityRepository: FakeRepository;
let appointmentService: AppointmentService;

// "Maintenant" pour tous les tests : mercredi 28 octobre 2026, 09:00 UTC
const NOW = new Date("2026-10-28T09:00:00.000Z").getTime();

const CLIENT_ID = 7;

// Une offre : le professionnel 5 propose le service 3 (30 min, 30000 au catalogue)
function makeOffer(customPrice: number | null = null, customDuration: number | null = null) {
    return {
        serviceId: 3,
        customPrice: customPrice,
        customDuration: customDuration,
        service: {
            id: 3,
            name: "Consultation générale",
            description: null,
            duration: 30,
            price: 30000,
        },
    };
}

// Une plage de travail du lundi, avec une période de validité facultative
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

// Plusieurs plages d'un coup : [["08:00", "12:00"], ["14:00", "18:00"]]
function makeAvailabilities(blocks: string[][]) {
    const rows = [];
    for (const block of blocks) {
        rows.push(makeAvailability(block[0], block[1]));
    }
    return rows;
}

// Les données d'une réservation chez le professionnel 5, pour le service 3
function bookingInput(startDatetime: string): CreateAppointmentInput {
    return { professionalId: 5, serviceId: 3, startDatetime: startDatetime };
}

beforeEach(() => {
    // On fige l'horloge : Date.now() renverra toujours NOW
    jest.spyOn(Date, "now").mockReturnValue(NOW);

    // Par défaut, tout va bien : le professionnel existe, propose le service,
    // travaille le lundi de 08:00 à 12:00 puis de 12:00 à 14:00, et rien n'est déjà pris
    fakeProfessionalRepository = {
        findById: jest.fn().mockResolvedValue({ userId: 5 }),
    };
    fakeOfferRepository = {
        findOne: jest.fn().mockResolvedValue(makeOffer()),
    };
    fakeAvailabilityRepository = {
        findByProfessionalAndDay: jest
            .fn()
            .mockResolvedValue(makeAvailabilities([["08:00", "12:00"], ["12:00", "14:00"]])),
    };
    fakeUnavailabilityRepository = {
        findOverlapping: jest.fn().mockResolvedValue([]),
    };
    fakeAppointmentRepository = {
        findOverlapping: jest.fn().mockResolvedValue([]),
        // Le faux "enregistre" : il renvoie ce qu'il a reçu, avec un identifiant et un statut
        create: jest.fn().mockImplementation(async (data: object) => ({
            id: 10,
            status: "PENDING",
            location: null,
            ...data,
        })),
        findForClient: jest.fn(),
        findForProfessional: jest.fn(),
        findById: jest.fn(),
        cancel: jest.fn(),
    };

    appointmentService = new AppointmentService(
        fakeAppointmentRepository as unknown as AppointmentRepository,
        fakeProfessionalRepository as unknown as ProfessionalRepository,
        fakeOfferRepository as unknown as OfferRepository,
        fakeAvailabilityRepository as unknown as AvailabilityRepository,
        fakeUnavailabilityRepository as unknown as UnavailabilityRepository
    );
});

afterEach(() => {
    // Remet Date.now() à la normale pour ne pas perturber d'autres tests
    jest.restoreAllMocks();
})

describe("AppointmentService.create : cas valides", () => {
    test("réserve un créneau valide et calcule la fin, le prix et le statut", async () => {
        const result = await appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"));

        expect(result).toMatchObject({
            status: "PENDING",
            startDatetime: "2026-11-09T06:00:00.000Z",
            endDatetime: "2026-11-09T06:30:00.000Z",
            priceAtBooking: 30000,
            clientId: 7,
            professionalId: 5,
            serviceId: 3,
        });
        expect(fakeAppointmentRepository.create).toHaveBeenCalledTimes(1);
    });

    test("vérifie les absences et les autres rendez-vous sur la bonne période (en UTC)", async () => {
        await appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"));

        const start = new Date("2026-11-09T06:00:00.000Z");
        const end = new Date("2026-11-09T06:30:00.000Z");
        expect(fakeUnavailabilityRepository.findOverlapping).toHaveBeenCalledWith(5, start, end);
        expect(fakeAppointmentRepository.findOverlapping).toHaveBeenCalledWith(5, start, end);
    });

    test("utilise la durée et le prix personnalisés de l'offre", async () => {
        fakeOfferRepository.findOne.mockResolvedValue(makeOffer(70000, 45));

        const result = await appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"));

        expect(result.endDatetime).toBe("2026-11-09T06:45:00.000Z");
        expect(result.priceAtBooking).toBe(70000);
    });

    test("accepte un rendez-vous à cheval sur deux plages qui se touchent", async () => {
        // 11:45 à 12:15 : 08:00-12:00 puis 12:00-14:00 couvrent tout
        const result = await appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T11:45:00+03:00"));

        expect(result.endDatetime).toBe("2026-11-09T09:15:00.000Z");
    });

    test("utilise le jour de la semaine LOCAL, pas celui d'UTC", async () => {
        // Lundi 01:00 à Madagascar = dimanche 22:00 en UTC
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue(
            makeAvailabilities([["00:00", "03:00"]])
        );

        await appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T01:00:00+03:00"));

        // 1 = lundi (le jour local), pas 0 = dimanche (le jour UTC)
        expect(fakeAvailabilityRepository.findByProfessionalAndDay).toHaveBeenCalledWith(5, 1);
    });

    test("enregistre les notes fournies", async () => {
        await appointmentService.create(CLIENT_ID, {
            ...bookingInput("2026-11-09T09:00:00+03:00"),
            notes: "Première visite",
        });

        expect(fakeAppointmentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ notes: "Première visite" })
        );
    });

    test("enregistre null quand il n'y a pas de notes", async () => {
        await appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"));

        expect(fakeAppointmentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ notes: null })
        );
    });
});

describe("AppointmentService.create : refus", () => {
    test("refuse un professionnel inconnu", async () => {
        fakeProfessionalRepository.findById.mockResolvedValue(null);

        await expect(
            appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"))
        ).rejects.toThrow(NotFoundError);
    });

    test("refuse un service que le professionnel ne propose pas", async () => {
        fakeOfferRepository.findOne.mockResolvedValue(null);

        await expect(
            appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"))
        ).rejects.toThrow(NotFoundError);
        expect(fakeAppointmentRepository.create).not.toHaveBeenCalled();
    });

    test("refuse un début qui n'est pas à une minute pile", async () => {
        await expect(
            appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:30+03:00"))
        ).rejects.toThrow(ValidationError);
    });

    test("refuse un début dans le passé", async () => {
        await expect(
            appointmentService.create(CLIENT_ID, bookingInput("2026-10-01T09:00:00+03:00"))
        ).rejects.toThrow(ValidationError);
    });

    // Chaque cas du tableau est un test : le même scénario avec d'autres horaires
    const outOfHoursCases = [
        {
            name: "dans le trou de la pause déjeuner",
            blocks: [["08:00", "12:00"], ["14:00", "18:00"]],
            start: "2026-11-09T11:45:00+03:00",
        },
        {
            name: "avant l'ouverture",
            blocks: [["08:00", "12:00"]],
            start: "2026-11-09T07:45:00+03:00",
        },
        {
            name: "après la fermeture",
            blocks: [["08:00", "12:00"]],
            start: "2026-11-09T12:30:00+03:00",
        },
        {
            name: "à cheval sur minuit",
            blocks: [["23:00", "23:59"]],
            start: "2026-11-09T23:45:00+03:00",
        },
        {
            name: "un jour sans aucune disponibilité",
            blocks: [],
            start: "2026-11-09T09:00:00+03:00",
        },
    ];

    test.each(outOfHoursCases)("refuse un rendez-vous hors horaires : $name", async ({ blocks, start }) => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue(makeAvailabilities(blocks));

        await expect(appointmentService.create(CLIENT_ID, bookingInput(start))).rejects.toThrow(ConflictError);
        expect(fakeAppointmentRepository.create).not.toHaveBeenCalled();
    });

    // La période de validité d'une plage : les bornes sont incluses
    const validityCases = [
        { name: "valable jusqu'au jour même", validFrom: null, validTo: "2026-11-09", accepted: true },
        { name: "valable à partir du jour même", validFrom: "2026-11-09", validTo: null, accepted: true },
        { name: "expirée la veille", validFrom: null, validTo: "2026-11-08", accepted: false },
        { name: "qui ne commence que le lendemain", validFrom: "2026-11-10", validTo: null, accepted: false },
    ];

    test.each(validityCases)("plage %# : $name", async ({ validFrom, validTo, accepted }) => {
        fakeAvailabilityRepository.findByProfessionalAndDay.mockResolvedValue([
            makeAvailability("08:00", "12:00", validFrom, validTo),
        ]);
        const input = bookingInput("2026-11-09T09:00:00+03:00");

        if (accepted) {
            const result = await appointmentService.create(CLIENT_ID, input);
            expect(result.status).toBe("PENDING");
        } else {
            await expect(appointmentService.create(CLIENT_ID, input)).rejects.toThrow(ConflictError);
        }
    });

    test("refuse une période où le professionnel est absent", async () => {
        fakeUnavailabilityRepository.findOverlapping.mockResolvedValue([{ id: 1 }]);

        await expect(
            appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"))
        ).rejects.toThrow(ConflictError);
        expect(fakeAppointmentRepository.create).not.toHaveBeenCalled();
    });

    test("refuse un créneau déjà réservé", async () => {
        fakeAppointmentRepository.findOverlapping.mockResolvedValue([{ id: 99 }]);

        await expect(
            appointmentService.create(CLIENT_ID, bookingInput("2026-11-09T09:00:00+03:00"))
        ).rejects.toThrow(ConflictError);
        expect(fakeAppointmentRepository.create).not.toHaveBeenCalled();
    });
});