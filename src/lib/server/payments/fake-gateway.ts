import { CreatePaymentLinkInput, GatewayCredentials, PaymentGateway, PaymentLink } from "./payment-gateway";

// Fausse version pour les tests et le développement sans Papi (PAYMENT_GATEWAY=fake dans .env).
// Elle ne contacte personne : elle renvoie un lien inventé.
export class FakePaymentGateway implements PaymentGateway {
    public calls: CreatePaymentLinkInput[] = [];

    async createPaymentLink(credentials: GatewayCredentials, input: CreatePaymentLinkInput): Promise<PaymentLink> {
        this.calls.push(input);
        return {
            paymentUrl: "https://fake-pay.local/" + input.reference,
            notificationToken: "fake-token-" + input.reference,
            expiresAt: new Date(Date.now() + input.validDurationHours * 3600 * 1000),
        };
    }
}
