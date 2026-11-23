import { encryptSecret, decryptSecret } from "../../lib/secret-box";

describe("secret-box", () => {
    const old = process.env.PAYMENT_ENCRYPTION_KEY;
    beforeEach(() => { process.env.PAYMENT_ENCRYPTION_KEY = "ab".repeat(32); });
    afterAll(() => { process.env.PAYMENT_ENCRYPTION_KEY = old; });

    it("chiffre puis déchiffre", () => {
        const stored = encryptSecret("ma-cle-api");
        expect(stored).not.toContain("ma-cle-api");
        expect(decryptSecret(stored)).toBe("ma-cle-api");
    });
    it("donne un résultat différent à chaque fois", () => {
        expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
    });
    it("refuse un texte modifié", () => {
        const parts = encryptSecret("secret").split(":");
        parts[3] = Buffer.from("autre chose").toString("base64");
        expect(() => decryptSecret(parts.join(":"))).toThrow();
    });
    it("refuse une mauvaise clé", () => {
        const stored = encryptSecret("secret");
        process.env.PAYMENT_ENCRYPTION_KEY = "cd".repeat(32);
        expect(() => decryptSecret(stored)).toThrow();
    });
    it("refuse une clé absente ou trop courte", () => {
        process.env.PAYMENT_ENCRYPTION_KEY = "abc";
        expect(() => encryptSecret("x")).toThrow();
    });
});
