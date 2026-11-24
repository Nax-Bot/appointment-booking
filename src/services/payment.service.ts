import type { PaymentAccountRepository } from "@/repositories/payment-account.repository";
import type { PaymentRepository } from "@/repositories/payment.repository";
import type { AppointmentRepository } from "@/repositories/appointment.repository";
import type { TransactionRunner } from "@/lib/server/db/transaction-runner";
import type { AppointmentNotifier } from "@/services/appointment-notifier.service";
import type { PaymentGateway } from "@/lib/server/payments/payment-gateway";
import { verifyPapiSignature } from "@/lib/server/payments/papi-signature";
import { encryptSecret, decryptSecret } from "@/lib/server/auth/secret-box";
import { PAYMENT_LINK_HOURS } from "@/lib/server/payments/payment-rules";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/server/http/errors";

// Montant minimum accepté par Papi (en MGA)
export const MIN_ONLINE_AMOUNT = 300;

export interface PaymentSettings {
    // Adresse publique de l'application (celle que Papi peut appeler), sans "/" final
    publicBaseUrl: string;
    // Pages du front vers lesquelles Papi renvoie le client (facultatives, affichage seulement)
    successUrl?: string;
    failureUrl?: string;
}

export interface SetupPaymentAccountInput {
    boutiqueCode: string;
    apiKey: string;
    webhookSecret: string;
}

export interface StartPaymentResult {
    paymentUrl: string;
    expiresAt: string;
    amount: number;
}

// Le résultat d'une notification, pour que la route réponde correctement à Papi
export type NotificationResult = "PAID" | "FAILED" | "IGNORED" | "ALREADY_DONE";

export class PaymentService {
    constructor(
        private paymentAccountRepository: PaymentAccountRepository,
        private paymentRepository: PaymentRepository,
        private appointmentRepository: AppointmentRepository,
        private transactionRunner: TransactionRunner,
        private gateway: PaymentGateway,
        private settings: PaymentSettings,
        private notifier?: AppointmentNotifier
    ) {}

    // Un professionnel enregistre (ou remplace) sa boutique Papi.
    // L'ancienne boutique devient RETIRED : on garde l'historique, mais elle n'est plus utilisée.
    async setupAccount(professionalId: number, input: SetupPaymentAccountInput) {
        const apiKeyEnc = encryptSecret(input.apiKey);
        const webhookSecretEnc = encryptSecret(input.webhookSecret);

        const account = await this.transactionRunner.run(async (db) => {
            await this.paymentAccountRepository.retireActive(professionalId, new Date(), db);
            return this.paymentAccountRepository.create(
                { professionalId, boutiqueCode: input.boutiqueCode, apiKeyEnc, webhookSecretEnc },
                db
            );
        });

        // On ne renvoie JAMAIS les clés
        return { id: account.id, boutiqueCode: account.boutiqueCode, status: account.status };
    }

    // Le professionnel a-t-il une boutique active ?
    async getAccountStatus(professionalId: number) {
        const account = await this.paymentAccountRepository.findActiveByProfessional(professionalId);
        if (!account) {
            return { configured: false, boutiqueCode: null };
        }
        return { configured: true, boutiqueCode: account.boutiqueCode };
    }

    // Un client lance le paiement d'un de ses rendez-vous en attente
    async startPayment(clientId: number, appointmentId: number): Promise<StartPaymentResult> {
        const appointment = await this.appointmentRepository.findById(appointmentId);
        if (!appointment || appointment.clientId !== clientId) {
            throw new NotFoundError("Rendez-vous introuvable");
        }
        if (appointment.status !== "PENDING") {
            throw new ConflictError("Ce rendez-vous n'est pas en attente de paiement");
        }

        const amount = Number(appointment.priceAtBooking);
        if (!(amount >= MIN_ONLINE_AMOUNT)) {
            throw new ConflictError("Le montant est trop faible pour un paiement en ligne (minimum " + MIN_ONLINE_AMOUNT + " MGA)");
        }

        const account = await this.paymentAccountRepository.findActiveByProfessional(appointment.professionalId);
        if (!account) {
            throw new ConflictError("Ce professionnel n'accepte pas encore le paiement en ligne");
        }

        // Un lien encore valide existe déjà : on le renvoie (évite les doublons si le client clique deux fois)
        const existing = await this.paymentRepository.findLatestByAppointment(appointmentId);
        if (existing && existing.paymentStatus === "PENDING" && existing.paymentUrl && existing.expiresAt && existing.expiresAt.getTime() > Date.now()) {
            return { paymentUrl: existing.paymentUrl, expiresAt: existing.expiresAt.toISOString(), amount: amount };
        }

        const reference = "rdv-" + appointmentId + "-" + Date.now();
        const clientName = appointment.client
            ? appointment.client.user.firstName + " " + appointment.client.user.lastName
            : "Client";

        const link = await this.gateway.createPaymentLink(
            { apiKey: decryptSecret(account.apiKeyEnc) },
            {
                reference: reference,
                amount: amount,
                description: "Rendez-vous #" + appointmentId + " - " + appointment.service.name,
                clientName: clientName,
                notificationUrl: this.settings.publicBaseUrl + "/api/payments/papi/notify/" + account.id,
                successUrl: this.settings.successUrl,
                failureUrl: this.settings.failureUrl,
                validDurationHours: PAYMENT_LINK_HOURS,
            }
        );

        await this.paymentRepository.create({
            appointmentId: appointmentId,
            paymentAccountId: account.id,
            amount: amount,
            reference: reference,
            notificationToken: link.notificationToken,
            paymentUrl: link.paymentUrl,
            expiresAt: link.expiresAt,
        });

        return { paymentUrl: link.paymentUrl, expiresAt: link.expiresAt.toISOString(), amount: amount };
    }

    // Papi nous notifie. LA SEULE chose qui confirme un paiement.
    // Ordre des vérifications : signature -> paiement connu -> même boutique -> même jeton -> même montant.
    async handleNotification(accountId: number, rawBody: string, signatureHeader: string | null): Promise<NotificationResult> {
        const account = await this.paymentAccountRepository.findById(accountId);
        if (!account) {
            throw new NotFoundError("Boutique inconnue");
        }

        // 1. La signature (avec le secret de CETTE boutique)
        const secret = decryptSecret(account.webhookSecretEnc);
        if (verifyPapiSignature(rawBody, signatureHeader, secret) === false) {
            throw new UnauthorizedError("Signature invalide");
        }

        // 2. Le contenu
        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch (error) {
            throw new ValidationError("Corps invalide", []);
        }

        const payment = await this.paymentRepository.findByReference(String(body.merchantPaymentReference ?? ""));
        if (!payment) {
            // Signature valide mais paiement inconnu (ex. lien de test) : on répond 200 pour que Papi n'insiste pas
            console.warn("[papi] notification pour une référence inconnue", body.merchantPaymentReference);
            return "IGNORED";
        }

        // 3. Cohérence : même boutique, même jeton, même montant
        if (payment.paymentAccountId !== account.id) {
            throw new ValidationError("Paiement d'une autre boutique", []);
        }
        if (payment.notificationToken !== body.notificationToken) {
            throw new ValidationError("Jeton de notification incorrect", []);
        }
        if (Number(payment.amount) !== Number(body.amount)) {
            console.error("[papi] montant différent", payment.reference, payment.amount, body.amount);
            throw new ValidationError("Montant incorrect", []);
        }

        // 4. Selon l'état annoncé par Papi
        if (body.paymentStatus === "SUCCESS") {
            return this.confirm(payment.id, payment.appointmentId, body);
        }
        if (body.paymentStatus === "FAILED") {
            const changed = await this.paymentRepository.markFailedIfPending(payment.id);
            return changed === 1 ? "FAILED" : "ALREADY_DONE";
        }
        return "IGNORED"; // PENDING : on attend la suite
    }

    // Paiement réussi : le paiement passe à PAID et le rendez-vous à CONFIRMED, ensemble ou pas du tout.
    // Une notification rejouée ne fait rien (le paiement n'est plus PENDING).
    private async confirm(paymentId: number, appointmentId: number, body: any): Promise<NotificationResult> {
        let appointmentConfirmed = false;

        const result = await this.transactionRunner.run(async (db) => {
            const changed = await this.paymentRepository.markPaidIfPending(
                paymentId,
                {
                    paymentDate: new Date(),
                    externalReference: typeof body.paymentReference === "string" ? body.paymentReference : null,
                    paymentMethod: mapPaymentMethod(body.paymentMethod),
                    feeAmount: typeof body.fee === "number" ? body.fee : null,
                },
                db
            );
            if (changed === 0) {
                return "ALREADY_DONE" as NotificationResult;
            }

            const confirmed = await this.appointmentRepository.confirmIfPending(appointmentId, db);
            if (confirmed === 0) {
                // Payé mais le rendez-vous n'est plus en attente (annulé entre-temps) : à rembourser.
                console.error("[papi] PAIEMENT REÇU POUR UN RENDEZ-VOUS NON EN ATTENTE, remboursement à faire", paymentId, appointmentId);
            } else {
                appointmentConfirmed = true;
            }
            return "PAID" as NotificationResult;
        });

        // Les emails partent APRÈS la transaction, et seulement si le rendez-vous vient d'être confirmé
        if (appointmentConfirmed && this.notifier) {
            await this.notifier.notifyConfirmed(appointmentId);
        }
        return result;
    }
}

// MVola, Airtel Money et Orange Money sont du mobile money ; BRED est une carte
function mapPaymentMethod(method: unknown): "CARD" | "MOBILE_MONEY" | null {
    if (method === "BRED") return "CARD";
    if (method === "MVOLA" || method === "AIRTEL_MONEY" || method === "ORANGE_MONEY") return "MOBILE_MONEY";
    return null;
}
