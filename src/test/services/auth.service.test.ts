import { AuthService } from "../../services/auth.service";
import { RateLimitService } from "../../services/rate-limit.service";
import type { UserRepository } from "../../repositories/user.repository";
import type { EmailVerificationRepository } from "../../repositories/email-verification.repository";
import type { RateLimitRepository } from "../../repositories/rate-limit.repository";
import type { EmailSender } from "../../lib/email-sender";
import { TooManyRequestsError, UnauthorizedError, ValidationError } from "../../lib/errors";

jest.mock("../../repositories/user.repository", () => ({}));
jest.mock("../../repositories/email-verification.repository", () => ({}));
jest.mock("../../repositories/rate-limit.repository", () => ({}));

// Le mot de passe "haché" est le mot de passe lui-même : on teste la limitation, pas bcrypt
jest.mock("../../lib/auth", () => ({
    hashPassword: async (password: string) => password,
    verifyPassword: async (password: string, hash: string) => password === hash,
}));

// Le secret exigé par le service pour calculer l'empreinte des codes (32 caractères minimum)
process.env.AUTH_SECRET = "secret-de-test-secret-de-test-123456";

type FakeRepository = Record<string, jest.Mock>;

const GOOD_PASSWORD = "Bonjour2026";
const VICTIM_EMAIL = "victime@example.com";

let fakeUserRepository: FakeRepository;
let fakeEmailVerificationRepository: FakeRepository;
let fakeEmailSender: { sendVerificationCode: jest.Mock };
let authService: AuthService;

// Un faux dépôt de compteurs EN MÉMOIRE : le vrai RateLimitService (la vraie logique de blocage) tourne dessus
function makeInMemoryRateLimitRepository() {
    interface Row {
        limitKey: string;
        count: number;
        windowStart: Date;
        blockedUntil: Date | null;
    }
    const rows = new Map<string, Row>();

    return {
        findByKey: async (key: string) => rows.get(key) ?? null,
        incrementFailures: async (key: string, now: Date) => {
            const row = rows.get(key) ?? { limitKey: key, count: 0, windowStart: now, blockedUntil: null };
            row.count = row.count + 1;
            rows.set(key, row);
            return row;
        },
        restartWindow: async (key: string, now: Date) => {
            const row = rows.get(key);
            if (row) {
                row.count = 0;
                row.windowStart = now;
                row.blockedUntil = null;
            }
        },
        setBlockedUntil: async (key: string, blockedUntil: Date) => {
            const row = rows.get(key);
            if (row) {
                row.blockedUntil = blockedUntil;
            }
        },
        deleteByKey: async (key: string) => {
            rows.delete(key);
        },
        deleteExpired: async () => undefined,
    };
}

// Un compte vérifié dont le mot de passe est GOOD_PASSWORD
function makeUser() {
    return {
        userId: 1,
        lastName: "Rakoto",
        firstName: "Jean",
        email: VICTIM_EMAIL,
        phoneNumber: null,
        passwordHash: GOOD_PASSWORD,
        emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
        client: {},
        professional: null,
        emailVerification: null,
    };
}

// Tente une connexion et renvoie "ok", "refusé" (mauvais identifiants) ou "bloqué" (429)
async function tryLogin(email: string, password: string, ip: string | null): Promise<string> {
    try {
        await authService.login({ email: email, password: password }, ip);
        return "ok";
    } catch (error) {
        if (error instanceof TooManyRequestsError) {
            return "bloqué";
        }
        if (error instanceof UnauthorizedError) {
            return "refusé";
        }
        throw error;
    }
}

beforeEach(() => {
    fakeUserRepository = {
        findByEmail: jest.fn().mockImplementation(async (email: string) => {
            return email === VICTIM_EMAIL ? makeUser() : null;
        }),
        deleteUnverifiedCreatedBefore: jest.fn().mockResolvedValue(undefined),
        deleteById: jest.fn().mockResolvedValue(undefined),
        createClientUser: jest.fn().mockImplementation(async (data: { email: string }) => ({
            ...makeUser(),
            email: data.email,
        })),
        createProfessionalUser: jest.fn(),
    };
    fakeEmailVerificationRepository = {
        incrementAttempts: jest.fn().mockResolvedValue(undefined),
        upsert: jest.fn().mockResolvedValue(undefined),
    };
    fakeEmailSender = { sendVerificationCode: jest.fn().mockResolvedValue(undefined) };

    const rateLimitService = new RateLimitService(makeInMemoryRateLimitRepository() as unknown as RateLimitRepository);

    authService = new AuthService(
        fakeUserRepository as unknown as UserRepository,
        fakeEmailVerificationRepository as unknown as EmailVerificationRepository,
        fakeEmailSender as unknown as EmailSender,
        true,
        rateLimitService
    );
});

describe("AuthService.login : blocage par couple email + adresse", () => {
    test("bloque après 5 échecs depuis la même adresse, même avec le bon mot de passe", async () => {
        for (let i = 0; i < 5; i++) {
            expect(await tryLogin(VICTIM_EMAIL, "mauvais", "10.0.0.1")).toBe("refusé");
        }

        expect(await tryLogin(VICTIM_EMAIL, GOOD_PASSWORD, "10.0.0.1")).toBe("bloqué");
    });

    test("un tiers qui échoue depuis SON adresse ne verrouille pas le vrai propriétaire", async () => {
        // L'attaquant (10.0.0.66) tape 5 faux mots de passe sur le compte de la victime
        for (let i = 0; i < 5; i++) {
            await tryLogin(VICTIM_EMAIL, "mauvais", "10.0.0.66");
        }
        expect(await tryLogin(VICTIM_EMAIL, "mauvais", "10.0.0.66")).toBe("bloqué");

        // La victime, depuis une autre adresse, se connecte normalement
        expect(await tryLogin(VICTIM_EMAIL, GOOD_PASSWORD, "10.0.0.2")).toBe("ok");
    });

    test("une connexion réussie remet le compteur du couple à zéro", async () => {
        for (let i = 0; i < 4; i++) {
            await tryLogin(VICTIM_EMAIL, "mauvais", "10.0.0.1");
        }
        expect(await tryLogin(VICTIM_EMAIL, GOOD_PASSWORD, "10.0.0.1")).toBe("ok");

        // Le compteur est reparti de zéro : 4 nouveaux échecs ne bloquent pas
        for (let i = 0; i < 4; i++) {
            expect(await tryLogin(VICTIM_EMAIL, "mauvais", "10.0.0.1")).toBe("refusé");
        }
    });

    test("le garde-fou par email bloque une attaque répartie sur beaucoup d'adresses", async () => {
        for (let i = 0; i < 50; i++) {
            await tryLogin(VICTIM_EMAIL, "mauvais", "172.16.0." + i);
        }

        expect(await tryLogin(VICTIM_EMAIL, GOOD_PASSWORD, "10.0.0.2")).toBe("bloqué");
    });

    test("sans adresse connue, on ne bloque pas à 5 échecs (seul le garde-fou par email agit)", async () => {
        for (let i = 0; i < 10; i++) {
            expect(await tryLogin(VICTIM_EMAIL, "mauvais", null)).toBe("refusé");
        }

        expect(await tryLogin(VICTIM_EMAIL, GOOD_PASSWORD, null)).toBe("ok");
    });

    test("bloque une même adresse après 20 échecs, tous emails confondus", async () => {
        for (let i = 0; i < 20; i++) {
            await tryLogin("inconnu" + i + "@example.com", "mauvais", "10.0.0.9");
        }

        expect(await tryLogin(VICTIM_EMAIL, GOOD_PASSWORD, "10.0.0.9")).toBe("bloqué");
    });
});

describe("AuthService : limitation par adresse sur inscription, vérification et renvoi", () => {
    function registerData(index: number) {
        return {
            role: "CLIENT" as const,
            lastName: "Test",
            firstName: "User",
            email: "user" + index + "@example.com",
            password: GOOD_PASSWORD,
        };
    }

    test("inscription : la 11e demande de la même adresse est bloquée", async () => {
        for (let i = 0; i < 10; i++) {
            await authService.register(registerData(i), "10.0.0.1");
        }

        await expect(authService.register(registerData(11), "10.0.0.1")).rejects.toThrow(TooManyRequestsError);
        expect(fakeUserRepository.createClientUser).toHaveBeenCalledTimes(10);
    });

    test("inscription : une autre adresse n'est pas touchée", async () => {
        for (let i = 0; i < 10; i++) {
            await authService.register(registerData(i), "10.0.0.1");
        }

        await expect(authService.register(registerData(50), "10.0.0.2")).resolves.toBeDefined();
    });

    test("inscription : sans adresse connue, aucune limite par adresse", async () => {
        for (let i = 0; i < 15; i++) {
            await authService.register(registerData(i), null);
        }

        expect(fakeUserRepository.createClientUser).toHaveBeenCalledTimes(15);
    });

    test("vérification du code : la 31e tentative de la même adresse est bloquée", async () => {
        for (let i = 0; i < 30; i++) {
            await expect(
                authService.verifyEmail({ email: "personne@example.com", code: "123456" }, "10.0.0.1")
            ).rejects.toThrow(ValidationError);
        }

        await expect(
            authService.verifyEmail({ email: "personne@example.com", code: "123456" }, "10.0.0.1")
        ).rejects.toThrow(TooManyRequestsError);
    });

    test("renvoi de code : la 11e demande de la même adresse est bloquée", async () => {
        for (let i = 0; i < 10; i++) {
            await authService.resendCode("personne@example.com", "10.0.0.1");
        }

        await expect(authService.resendCode("personne@example.com", "10.0.0.1")).rejects.toThrow(TooManyRequestsError);
    });
});
