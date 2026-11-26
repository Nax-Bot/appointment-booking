process.env.AUTH_SECRET = "x".repeat(40);
import { resetPasswordSchema, updateProfileSchema, changePasswordSchema } from "../../validations/account.validation";

describe("validations du compte", () => {
    it("le nouveau mot de passe suit la règle de l'inscription", () => {
        expect(resetPasswordSchema.safeParse({ email: "a@b.com", code: "123456", newPassword: "faible" }).success).toBe(false);
        expect(resetPasswordSchema.safeParse({ email: "A@B.com ", code: "123456", newPassword: "Fort1234" }).success).toBe(true);
        expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "sansmajuscule1" }).success).toBe(false);
    });
    it("le code doit avoir 6 chiffres", () => {
        expect(resetPasswordSchema.safeParse({ email: "a@b.com", code: "12345", newPassword: "Fort1234" }).success).toBe(false);
    });
    it("le profil exige au moins un champ", () => {
        expect(updateProfileSchema.safeParse({}).success).toBe(false);
        expect(updateProfileSchema.safeParse({ firstName: "Nax" }).success).toBe(true);
    });
    it("le profil refuse un champ inconnu (email, rôle...)", () => {
        expect(updateProfileSchema.safeParse({ email: "x@y.com" }).success).toBe(false);
        expect(updateProfileSchema.safeParse({ role: "PROFESSIONAL" }).success).toBe(false);
    });
    it("la date de naissance doit exister et être passée", () => {
        expect(updateProfileSchema.safeParse({ birthDate: "1995-02-30" }).success).toBe(false);
        expect(updateProfileSchema.safeParse({ birthDate: "2999-01-01" }).success).toBe(false);
        expect(updateProfileSchema.safeParse({ birthDate: "1995-04-12" }).success).toBe(true);
        expect(updateProfileSchema.safeParse({ birthDate: null }).success).toBe(true);
    });
    it("le téléphone peut être effacé avec null mais pas vide", () => {
        expect(updateProfileSchema.safeParse({ phoneNumber: null }).success).toBe(true);
        expect(updateProfileSchema.safeParse({ phoneNumber: "  " }).success).toBe(false);
    });
});
