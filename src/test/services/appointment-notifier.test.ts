import { AppointmentNotifier } from "../../services/appointment-notifier.service";
import { buildAppointmentCancelledEmail, buildAppointmentConfirmedEmail } from "../../lib/server/email/email-templates";

jest.mock("../../repositories/appointment.repository", () => ({}));

const START = new Date("2026-11-23T11:00:00.000Z"); // 14:00 à Madagascar (UTC+3)

function row(over: Record<string, unknown> = {}) {
    return {
        id: 10,
        startDatetime: START,
        cancellationReason: null,
        guestName: null,
        service: { name: "Coupe" },
        client: { user: { firstName: "Marie", lastName: "Rakoto", email: "marie@example.com" } },
        professional: { user: { firstName: "Jean", lastName: "Dupont", email: "jean@example.com" } },
        ...over,
    };
}

let repo: { findForNotification: jest.Mock };
let sender: { sendNotification: jest.Mock };
let notifier: AppointmentNotifier;

beforeEach(() => {
    repo = { findForNotification: jest.fn().mockResolvedValue(row()) };
    sender = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    notifier = new AppointmentNotifier(repo as any, sender as any);
    jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("AppointmentNotifier", () => {
    it("confirmation : prévient le client ET le professionnel", async () => {
        await notifier.notifyConfirmed(10);
        const recipients = sender.sendNotification.mock.calls.map((c) => c[0]);
        expect(recipients).toEqual(["marie@example.com", "jean@example.com"]);
    });
    it("annulation par le client : seul le professionnel est prévenu", async () => {
        await notifier.notifyCancelled(10, "CLIENT");
        expect(sender.sendNotification.mock.calls.map((c) => c[0])).toEqual(["jean@example.com"]);
    });
    it("annulation par le professionnel : seul le client est prévenu", async () => {
        await notifier.notifyCancelled(10, "PROFESSIONAL");
        expect(sender.sendNotification.mock.calls.map((c) => c[0])).toEqual(["marie@example.com"]);
    });
    it("annulation automatique : les deux sont prévenus", async () => {
        await notifier.notifyCancelled(10, "SYSTEM");
        expect(sender.sendNotification).toHaveBeenCalledTimes(2);
    });
    it("rendez-vous d'invité (sans compte client) : aucun email", async () => {
        repo.findForNotification.mockResolvedValue(row({ client: null }));
        await notifier.notifyConfirmed(10);
        expect(sender.sendNotification).not.toHaveBeenCalled();
    });
    it("une panne d'envoi ne fait jamais échouer l'opération", async () => {
        sender.sendNotification.mockRejectedValue(new Error("SMTP en panne"));
        await expect(notifier.notifyConfirmed(10)).resolves.toBeUndefined();
        await expect(notifier.notifyCancelled(10, "SYSTEM")).resolves.toBeUndefined();
    });
});

describe("modèles d'emails de rendez-vous", () => {
    const info = { appointmentId: 10, serviceName: "Coupe", startDatetime: START, professionalName: "Jean Dupont", clientName: "Marie Rakoto" };

    it("affiche l'heure locale de Madagascar", () => {
        const mail = buildAppointmentConfirmedEmail(info, "CLIENT");
        expect(mail.text).toContain("14:00");
        expect(mail.text).toContain("23 novembre 2026");
    });
    it("neutralise le HTML dans les noms et la raison", () => {
        const mail = buildAppointmentCancelledEmail(
            { ...info, clientName: "<script>alert(1)</script>", reason: "<b>x</b>" },
            "PROFESSIONAL",
            "CLIENT"
        );
        expect(mail.html).not.toContain("<script>");
        expect(mail.html).not.toContain("<b>x</b>");
        expect(mail.html).toContain("&lt;script&gt;");
    });
    it("indique la raison d'annulation si elle existe", () => {
        expect(buildAppointmentCancelledEmail({ ...info, reason: "Imprévu" }, "CLIENT", "PROFESSIONAL").text).toContain("Raison : Imprévu");
    });
});
