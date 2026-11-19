import { getAuthSecret } from "../../lib/auth-secret";

const SAVED_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...SAVED_ENV };
    jest.restoreAllMocks();
});

describe("getAuthSecret", () => {
    test("renvoie un secret d'au moins 32 caractères", () => {
        process.env.AUTH_SECRET = "a".repeat(32);

        expect(getAuthSecret()).toBe("a".repeat(32));
    });

    test("refuse un secret absent", () => {
        delete process.env.AUTH_SECRET;

        expect(() => getAuthSecret()).toThrow("AUTH_SECRET est manquant");
    });

    test("en production, refuse un secret trop court", () => {
        process.env.AUTH_SECRET = "court";
        (process.env as Record<string, string>).NODE_ENV = "production";

        expect(() => getAuthSecret()).toThrow("trop court");
    });

    test("en développement, un secret court est accepté (avec un avertissement)", () => {
        process.env.AUTH_SECRET = "court";
        (process.env as Record<string, string>).NODE_ENV = "development";
        jest.spyOn(console, "warn").mockImplementation(() => undefined);

        expect(getAuthSecret()).toBe("court");
    });
});
