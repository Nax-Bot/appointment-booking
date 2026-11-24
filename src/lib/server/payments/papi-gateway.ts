import { ServiceUnavailableError, ValidationError } from "../http/errors";
import {
    CreatePaymentLinkInput,
    GatewayCredentials,
    PaymentGateway,
    PaymentLink,
} from "./payment-gateway";

const PAPI_PAYMENT_LINKS_URL = "https://app.papi.mg/engine/api/payment-links";

// La vraie version : appelle l'API de Papi avec fetch.
export class PapiGateway implements PaymentGateway {
    async createPaymentLink(credentials: GatewayCredentials, input: CreatePaymentLinkInput): Promise<PaymentLink> {
        const body: Record<string, unknown> = {
            clientName: input.clientName,
            amount: input.amount,
            reference: input.reference,
            description: input.description.slice(0, 255),
            notificationUrl: input.notificationUrl,
            validDuration: input.validDurationHours,
        };
        if (input.payerEmail !== undefined) body.payerEmail = input.payerEmail;
        if (input.successUrl !== undefined) body.successUrl = input.successUrl;
        if (input.failureUrl !== undefined) body.failureUrl = input.failureUrl;

        let response: Response;
        try {
            response = await fetch(PAPI_PAYMENT_LINKS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", Token: credentials.apiKey },
                body: JSON.stringify(body),
                // On n'attend pas indéfiniment la réponse de Papi
                signal: AbortSignal.timeout(15000),
            });
        } catch (error) {
            throw new ServiceUnavailableError("Le service de paiement ne répond pas");
        }

        // On lit le texte d'abord : une erreur peut ne pas être du JSON
        const text = await response.text();
        let json: any = null;
        try {
            json = JSON.parse(text);
        } catch (error) {
            json = null;
        }

        if (response.ok === false) {
            // Erreur de Papi : { "error": { "code": ..., "message": ... } }
            // On affiche le détail dans la console serveur, pas au client.
            console.error("Papi a refusé la demande de paiement", response.status, text);
            if (response.status >= 400 && response.status < 500) {
                throw new ValidationError("Le service de paiement a refusé la demande", [
                    json?.error?.message ?? "Erreur " + response.status,
                ]);
            }
            throw new ServiceUnavailableError("Le service de paiement est indisponible");
        }

        const data = json?.data;
        if (!data || typeof data.paymentLink !== "string" || typeof data.notificationToken !== "string") {
            console.error("Réponse Papi inattendue", text);
            throw new ServiceUnavailableError("Réponse inattendue du service de paiement");
        }

        return {
            paymentUrl: data.paymentLink,
            notificationToken: data.notificationToken,
            expiresAt: new Date(data.linkExpirationDateTime),
        };
    }
}
