import { registerSchema, loginSchema } from "../../validations/auth.validation";

// Des données d'inscription valides, dont on change seulement le mot de passe
function registerWith(password: string) {
    return registerSchema.safeParse({
        role: "CLIENT",
        lastName: "Rakoto",
        firstName: "Nax",
        email: "nax@example.com",
        password: password,
    });
}

// Les messages d'erreur du mot de passe
function passwordMessages(password: string): string[] {
    const result = registerWith(password);
    if (result.success) {
        return [];
    }
    return result.error.issues.map((issue) => issue.message);
}

describe("registerSchema : règle du mot de passe", () => {
    test("accepte un mot de passe valide", () => {
        expect(registerWith("Motdepasse1").success).toBe(true);
    });

    test("accepte un mot de passe avec des lettres accentuées", () => {
        expect(registerWith("Éléphant12").success).toBe(true);
    });

    test("refuse moins de 8 caractères", () => {
        expect(passwordMessages("Abc123")).toContain("Le mot de passe doit contenir au moins 8 caractères");
    });

    test("refuse un mot de passe sans majuscule", () => {
        expect(passwordMessages("motdepasse1")).toContain("Le mot de passe doit contenir au moins une majuscule");
    });

    test("refuse un mot de passe sans minuscule", () => {
        expect(passwordMessages("MOTDEPASSE1")).toContain("Le mot de passe doit contenir au moins une minuscule");
    });

    test("refuse un mot de passe sans chiffre", () => {
        expect(passwordMessages("Motdepasse")).toContain("Le mot de passe doit contenir au moins un chiffre");
    });

    test("accepte exactement 72 octets", () => {
        const password = "Aa1" + "x".repeat(69);
        expect(registerWith(password).success).toBe(true);
    });

    test("refuse plus de 72 octets", () => {
        const password = "Aa1" + "x".repeat(70);
        expect(passwordMessages(password)).toContain("Le mot de passe est trop long (72 octets maximum)");
    });

    test("compte les octets et pas les caractères : 40 'é' font 80 octets", () => {
        // 43 caractères seulement, mais 3 + 80 = 83 octets
        const password = "Aa1" + "é".repeat(40);
        expect(password.length).toBeLessThan(72);
        expect(passwordMessages(password)).toContain("Le mot de passe est trop long (72 octets maximum)");
    });
});

describe("loginSchema : l'ancienne règle reste valable à la connexion", () => {
    test("accepte un ancien mot de passe sans majuscule ni chiffre", () => {
        const result = loginSchema.safeParse({ email: "nax@example.com", password: "motdepasse" });
        expect(result.success).toBe(true);
    });
});