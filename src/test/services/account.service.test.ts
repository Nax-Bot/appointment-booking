import { AccountService } from "../../services/account.service";
import { hashCode } from "../../lib/verification-code";
import { ConflictError, TooManyRequestsError, UnauthorizedError, ValidationError } from "../../lib/errors";

process.env.AUTH_SECRET = "x".repeat(40);

jest.mock("../../repositories/user.repository", () => ({}));
jest.mock("../../repositories/password-reset.repository", () => ({}));
jest.mock("../../services/rate-limit.service", () => ({}));
// Faux bcrypt : rapide et prévisible
jest.mock("../../lib/auth", () => ({
    hashPassword: async (p: string) => "hash:" + p,
    verifyPassword: async (p: string, h: string) => h === "hash:" + p,
}));

type Fake = Record<string, jest.Mock>;
let users: Fake, resets: Fake, limits: Fake, sender: Fake, service: AccountService;

const EMAIL = "marie@example.com";
const DAY = 24 * 60 * 60 * 1000;

function user(over: Record<string, unknown> = {}) {
    return {
        userId: 7, firstName: "Marie", lastName: "Rakoto", email: EMAIL, phoneNumber: null,
        passwordHash: "hash:OldPass1", emailVerifiedAt: new Date(), nameChangedAt: null,
        client: { birthDate: null, address: null }, professional: null, ...over,
    };
}
function reset(code: string, over: Record<string, unknown> = {}) {
    return { userId: 7, codeHash: hashCode("reset:" + EMAIL, code), expiresAt: new Date(Date.now() + 600000), attempts: 0, ...over };
}

beforeEach(() => {
    users = {
        findByEmail: jest.fn().mockResolvedValue(user()),
        findById: jest.fn().mockResolvedValue(user()),
        resetPassword: jest.fn().mockResolvedValue(undefined),
        updatePassword: jest.fn().mockResolvedValue(undefined),
        updateProfile: jest.fn().mockImplementation(async (_id: number, d: any) => user({ ...d, client: { birthDate: null, address: null, ...(d.client ?? {}) } })),
    };
    resets = { findByUserId: jest.fn(), upsert: jest.fn(), incrementAttempts: jest.fn() };
    limits = { getRetryAfterSeconds: jest.fn().mockResolvedValue(0), registerFailure: jest.fn(), reset: jest.fn() };
    sender = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    service = new AccountService(users as any, resets as any, limits as any, sender as any);
    jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("forgotPassword", () => {
    it("enregistre un code (haché) et l'envoie par email", async () => {
        await service.forgotPassword(EMAIL, "1.2.3.4");
        expect(resets.upsert).toHaveBeenCalledTimes(1);
        const [userId, hash] = resets.upsert.mock.calls[0];
        expect(userId).toBe(7);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        const mail = sender.sendNotification.mock.calls[0];
        expect(mail[0]).toBe(EMAIL);
        const code = mail[1].text.match(/: ([0-9]{6})/)[1];
        expect(hash).toBe(hashCode("reset:" + EMAIL, code));
    });
    it("ne révèle rien si le compte n'existe pas", async () => {
        users.findByEmail.mockResolvedValue(null);
        await expect(service.forgotPassword(EMAIL, null)).resolves.toBeUndefined();
        expect(sender.sendNotification).not.toHaveBeenCalled();
    });
    it("n'envoie rien pour un compte non vérifié", async () => {
        users.findByEmail.mockResolvedValue(user({ emailVerifiedAt: null }));
        await service.forgotPassword(EMAIL, null);
        expect(sender.sendNotification).not.toHaveBeenCalled();
    });
    it("n'envoie plus rien quand l'adresse a atteint sa limite horaire", async () => {
        limits.getRetryAfterSeconds.mockImplementation(async (key: string) => (key.startsWith("forgot:email:") ? 1800 : 0));
        await service.forgotPassword(EMAIL, null);
        expect(sender.sendNotification).not.toHaveBeenCalled();
    });
    it("refuse (429) quand l'adresse IP est bloquée", async () => {
        limits.getRetryAfterSeconds.mockResolvedValue(600);
        await expect(service.forgotPassword(EMAIL, "1.2.3.4")).rejects.toBeInstanceOf(TooManyRequestsError);
    });
    it("une panne d'email ne change pas la réponse", async () => {
        sender.sendNotification.mockRejectedValue(new Error("SMTP"));
        await expect(service.forgotPassword(EMAIL, null)).resolves.toBeUndefined();
    });
});

describe("resetPassword", () => {
    const input = { email: EMAIL, code: "123456", newPassword: "NewPass1" };

    it("change le mot de passe avec le bon code", async () => {
        resets.findByUserId.mockResolvedValue(reset("123456"));
        await service.resetPassword(input, null);
        expect(users.resetPassword).toHaveBeenCalledWith(7, "hash:NewPass1");
        expect(limits.reset).toHaveBeenCalledWith("login:email:" + EMAIL);
        expect(sender.sendNotification).toHaveBeenCalledTimes(1); // avis de changement
    });
    it("refuse un mauvais code et compte l'essai", async () => {
        resets.findByUserId.mockResolvedValue(reset("999999"));
        await expect(service.resetPassword(input, null)).rejects.toBeInstanceOf(ValidationError);
        expect(resets.incrementAttempts).toHaveBeenCalledWith(7);
        expect(users.resetPassword).not.toHaveBeenCalled();
    });
    it("refuse un code expiré", async () => {
        resets.findByUserId.mockResolvedValue(reset("123456", { expiresAt: new Date(Date.now() - 1000) }));
        await expect(service.resetPassword(input, null)).rejects.toBeInstanceOf(ValidationError);
    });
    it("refuse après 5 essais, même avec le bon code", async () => {
        resets.findByUserId.mockResolvedValue(reset("123456", { attempts: 5 }));
        await expect(service.resetPassword(input, null)).rejects.toBeInstanceOf(TooManyRequestsError);
        expect(users.resetPassword).not.toHaveBeenCalled();
    });
    it("refuse un compte inconnu ou sans code avec le même message", async () => {
        users.findByEmail.mockResolvedValue(null);
        await expect(service.resetPassword(input, null)).rejects.toThrow("Code invalide ou expiré");
        users.findByEmail.mockResolvedValue(user());
        resets.findByUserId.mockResolvedValue(null);
        await expect(service.resetPassword(input, null)).rejects.toThrow("Code invalide ou expiré");
    });
    it("un code de vérification d'email ne fonctionne pas comme code de réinitialisation", async () => {
        resets.findByUserId.mockResolvedValue({ ...reset("123456"), codeHash: hashCode(EMAIL, "123456") });
        await expect(service.resetPassword(input, null)).rejects.toBeInstanceOf(ValidationError);
    });
});

describe("changePassword", () => {
    it("change le mot de passe si l'actuel est correct", async () => {
        await service.changePassword(7, { currentPassword: "OldPass1", newPassword: "NewPass1" });
        expect(users.updatePassword).toHaveBeenCalledWith(7, "hash:NewPass1");
        expect(sender.sendNotification).toHaveBeenCalledTimes(1);
    });
    it("refuse un mauvais mot de passe actuel et compte l'échec", async () => {
        await expect(service.changePassword(7, { currentPassword: "Wrong1", newPassword: "NewPass1" })).rejects.toBeInstanceOf(ValidationError);
        expect(limits.registerFailure).toHaveBeenCalled();
        expect(users.updatePassword).not.toHaveBeenCalled();
    });
    it("refuse un nouveau mot de passe identique à l'actuel", async () => {
        await expect(service.changePassword(7, { currentPassword: "OldPass1", newPassword: "OldPass1" })).rejects.toBeInstanceOf(ValidationError);
    });
    it("refuse (429) quand l'utilisateur est bloqué", async () => {
        limits.getRetryAfterSeconds.mockResolvedValue(300);
        await expect(service.changePassword(7, { currentPassword: "OldPass1", newPassword: "NewPass1" })).rejects.toBeInstanceOf(TooManyRequestsError);
        expect(users.updatePassword).not.toHaveBeenCalled();
    });
    it("refuse une session dont le compte n'existe plus", async () => {
        users.findById.mockResolvedValue(null);
        await expect(service.changePassword(7, { currentPassword: "OldPass1", newPassword: "NewPass1" })).rejects.toBeInstanceOf(UnauthorizedError);
    });
});

describe("updateProfile", () => {
    it("autorise un premier changement de nom et le date", async () => {
        const result = await service.updateProfile(7, "CLIENT", { firstName: "Maria" });
        const data = users.updateProfile.mock.calls[0][1];
        expect(data.firstName).toBe("Maria");
        expect(data.lastName).toBeUndefined();
        expect(data.nameChangedAt).toBeInstanceOf(Date);
        expect(result.nameChangeAvailableAt).not.toBeNull();
    });
    it("refuse un second changement de nom avant 30 jours", async () => {
        users.findById.mockResolvedValue(user({ nameChangedAt: new Date(Date.now() - 10 * DAY) }));
        await expect(service.updateProfile(7, "CLIENT", { lastName: "Autre" })).rejects.toBeInstanceOf(ConflictError);
        expect(users.updateProfile).not.toHaveBeenCalled();
    });
    it("autorise un changement de nom après 30 jours", async () => {
        users.findById.mockResolvedValue(user({ nameChangedAt: new Date(Date.now() - 31 * DAY) }));
        await service.updateProfile(7, "CLIENT", { lastName: "Autre" });
        expect(users.updateProfile).toHaveBeenCalled();
    });
    it("le téléphone est libre, même pendant le délai du nom", async () => {
        users.findById.mockResolvedValue(user({ nameChangedAt: new Date(Date.now() - DAY) }));
        await service.updateProfile(7, "CLIENT", { phoneNumber: "0341234567" });
        const data = users.updateProfile.mock.calls[0][1];
        expect(data.phoneNumber).toBe("0341234567");
        expect(data.nameChangedAt).toBeUndefined();
    });
    it("renvoyer le même nom ne consomme pas le délai", async () => {
        const result = await service.updateProfile(7, "CLIENT", { firstName: "Marie", lastName: "Rakoto" });
        expect(users.updateProfile).not.toHaveBeenCalled();
        expect(result.firstName).toBe("Marie");
    });
    it("un client peut modifier date de naissance et adresse", async () => {
        await service.updateProfile(7, "CLIENT", { birthDate: "1995-04-12", address: "Lot 12, Antananarivo" });
        const data = users.updateProfile.mock.calls[0][1];
        expect(data.client.birthDate).toEqual(new Date("1995-04-12T00:00:00.000Z"));
        expect(data.client.address).toBe("Lot 12, Antananarivo");
    });
    it("un professionnel ne peut pas envoyer date de naissance ou adresse", async () => {
        users.findById.mockResolvedValue(user({ client: null, professional: {} }));
        await expect(service.updateProfile(7, "PROFESSIONAL", { address: "x" })).rejects.toBeInstanceOf(ValidationError);
    });
});
