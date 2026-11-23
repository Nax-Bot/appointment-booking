import { createHmac } from "crypto";
import { PaymentService } from "../../services/payment.service";
import { FakePaymentGateway } from "../../lib/payments/fake-gateway";
import { encryptSecret } from "../../lib/secret-box";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";

jest.mock("../../repositories/payment-account.repository", () => ({}));
jest.mock("../../repositories/payment.repository", () => ({}));
jest.mock("../../repositories/appointment.repository", () => ({}));
jest.mock("../../lib/transaction-runner", () => ({}));

const SECRET = "pwhsec_" + "a".repeat(64);
const db = { name: "tx" };

type Fake = Record<string, jest.Mock>;
let accounts: Fake, payments: Fake, appointments: Fake, gateway: FakePaymentGateway, service: PaymentService;

function appointment(over: any = {}) {
    return {
        id: 10, clientId: 7, professionalId: 5, status: "PENDING", priceAtBooking: 30000,
        service: { id: 3, name: "Coupe" },
        client: { user: { firstName: "Marie", lastName: "Rakoto" } },
        ...over,
    };
}
const account = () => ({ id: 2, professionalId: 5, boutiqueCode: "RDV01", apiKeyEnc: encryptSecret("KEY1234567890"), webhookSecretEnc: encryptSecret(SECRET), status: "ACTIVE" });
function payment(over: any = {}) {
    return { id: 1, appointmentId: 10, paymentAccountId: 2, amount: 30000, reference: "rdv-10-1", notificationToken: "tok", paymentStatus: "PENDING", paymentUrl: "https://x", expiresAt: new Date(Date.now() + 3600000), ...over };
}
function signed(body: object, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
    const raw = JSON.stringify(body);
    return { raw, header: "t=" + t + ",v1=" + createHmac("sha256", secret).update(t + "." + raw).digest("hex") };
}
const okBody = { paymentStatus: "SUCCESS", merchantPaymentReference: "rdv-10-1", notificationToken: "tok", amount: 30000, fee: 1140, paymentMethod: "MVOLA", paymentReference: "uuid-1" };

beforeEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = "ab".repeat(32);
    accounts = { findActiveByProfessional: jest.fn(), findById: jest.fn().mockResolvedValue(account()), retireActive: jest.fn(), create: jest.fn() };
    payments = { create: jest.fn(), findByReference: jest.fn().mockResolvedValue(payment()), findLatestByAppointment: jest.fn().mockResolvedValue(null), markPaidIfPending: jest.fn().mockResolvedValue(1), markFailedIfPending: jest.fn().mockResolvedValue(1) };
    appointments = { findById: jest.fn().mockResolvedValue(appointment()), confirmIfPending: jest.fn().mockResolvedValue(1) };
    gateway = new FakePaymentGateway();
    const runner: any = { run: (work: any) => work(db) };
    service = new PaymentService(accounts as any, payments as any, appointments as any, runner, gateway, { publicBaseUrl: "https://pub.example" });
});

describe("startPayment", () => {
    beforeEach(() => accounts.findActiveByProfessional.mockResolvedValue(account()));

    it("crée un lien et enregistre le paiement", async () => {
        const r = await service.startPayment(7, 10);
        expect(r.paymentUrl).toContain("fake-pay.local");
        expect(gateway.calls[0].notificationUrl).toBe("https://pub.example/api/payments/papi/notify/2");
        expect(gateway.calls[0].amount).toBe(30000);
        expect(payments.create).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 10, paymentAccountId: 2, amount: 30000 }));
    });
    it("refuse le rendez-vous d'un autre client", async () => {
        await expect(service.startPayment(99, 10)).rejects.toBeInstanceOf(NotFoundError);
    });
    it("refuse un rendez-vous non en attente", async () => {
        appointments.findById.mockResolvedValue(appointment({ status: "CONFIRMED" }));
        await expect(service.startPayment(7, 10)).rejects.toBeInstanceOf(ConflictError);
    });
    it("refuse un montant sous 300 MGA", async () => {
        appointments.findById.mockResolvedValue(appointment({ priceAtBooking: 200 }));
        await expect(service.startPayment(7, 10)).rejects.toBeInstanceOf(ConflictError);
    });
    it("refuse si le professionnel n'a pas de boutique", async () => {
        accounts.findActiveByProfessional.mockResolvedValue(null);
        await expect(service.startPayment(7, 10)).rejects.toBeInstanceOf(ConflictError);
    });
    it("renvoie le lien existant encore valide sans en créer un autre", async () => {
        payments.findLatestByAppointment.mockResolvedValue(payment());
        const r = await service.startPayment(7, 10);
        expect(r.paymentUrl).toBe("https://x");
        expect(gateway.calls.length).toBe(0);
    });
    it("crée un nouveau lien si l'ancien est expiré", async () => {
        payments.findLatestByAppointment.mockResolvedValue(payment({ expiresAt: new Date(Date.now() - 1000) }));
        await service.startPayment(7, 10);
        expect(gateway.calls.length).toBe(1);
    });
});

describe("handleNotification", () => {
    it("confirme le paiement et le rendez-vous", async () => {
        const s = signed(okBody);
        expect(await service.handleNotification(2, s.raw, s.header)).toBe("PAID");
        expect(payments.markPaidIfPending).toHaveBeenCalledWith(1, expect.objectContaining({ paymentMethod: "MOBILE_MONEY", feeAmount: 1140, externalReference: "uuid-1" }), db);
        expect(appointments.confirmIfPending).toHaveBeenCalledWith(10, db);
    });
    it("refuse une mauvaise signature sans rien modifier", async () => {
        const s = signed(okBody, "pwhsec_" + "b".repeat(64));
        await expect(service.handleNotification(2, s.raw, s.header)).rejects.toBeInstanceOf(UnauthorizedError);
        expect(payments.markPaidIfPending).not.toHaveBeenCalled();
    });
    it("refuse une boutique inconnue", async () => {
        accounts.findById.mockResolvedValue(null);
        await expect(service.handleNotification(9, "{}", null)).rejects.toBeInstanceOf(NotFoundError);
    });
    it("refuse un montant différent", async () => {
        const s = signed({ ...okBody, amount: 100 });
        await expect(service.handleNotification(2, s.raw, s.header)).rejects.toBeInstanceOf(ValidationError);
        expect(payments.markPaidIfPending).not.toHaveBeenCalled();
    });
    it("refuse un mauvais jeton", async () => {
        const s = signed({ ...okBody, notificationToken: "autre" });
        await expect(service.handleNotification(2, s.raw, s.header)).rejects.toBeInstanceOf(ValidationError);
    });
    it("refuse un paiement d'une autre boutique", async () => {
        payments.findByReference.mockResolvedValue(payment({ paymentAccountId: 3 }));
        const s = signed(okBody);
        await expect(service.handleNotification(2, s.raw, s.header)).rejects.toBeInstanceOf(ValidationError);
    });
    it("ignore une notification rejouée", async () => {
        payments.markPaidIfPending.mockResolvedValue(0);
        const s = signed(okBody);
        expect(await service.handleNotification(2, s.raw, s.header)).toBe("ALREADY_DONE");
        expect(appointments.confirmIfPending).not.toHaveBeenCalled();
    });
    it("ignore une référence inconnue", async () => {
        payments.findByReference.mockResolvedValue(null);
        const s = signed(okBody);
        expect(await service.handleNotification(2, s.raw, s.header)).toBe("IGNORED");
    });
    it("un échec marque le paiement FAILED sans toucher au rendez-vous", async () => {
        const s = signed({ ...okBody, paymentStatus: "FAILED" });
        expect(await service.handleNotification(2, s.raw, s.header)).toBe("FAILED");
        expect(appointments.confirmIfPending).not.toHaveBeenCalled();
    });
    it("PENDING ne change rien", async () => {
        const s = signed({ ...okBody, paymentStatus: "PENDING" });
        expect(await service.handleNotification(2, s.raw, s.header)).toBe("IGNORED");
        expect(payments.markPaidIfPending).not.toHaveBeenCalled();
    });
});

describe("setupAccount", () => {
    it("chiffre les clés, retire l'ancienne boutique et ne renvoie pas les clés", async () => {
        accounts.create.mockImplementation(async (d: any) => ({ id: 4, ...d, status: "ACTIVE" }));
        const r = await service.setupAccount(5, { boutiqueCode: "RDV01", apiKey: "KEY1234567890", webhookSecret: SECRET });
        expect(accounts.retireActive).toHaveBeenCalledWith(5, expect.any(Date), db);
        const saved = accounts.create.mock.calls[0][0];
        expect(saved.apiKeyEnc).not.toContain("KEY1234567890");
        expect(saved.webhookSecretEnc).not.toContain("pwhsec_");
        expect(JSON.stringify(r)).not.toContain("KEY1234567890");
    });
});
