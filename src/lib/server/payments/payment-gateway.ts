// Ce que l'application demande à un service de paiement, sans savoir lequel est utilisé.
// Deux versions existent : PapiGateway (le vrai) et FakePaymentGateway (pour les tests).

// Les identifiants d'une boutique (un professionnel = une boutique)
export interface GatewayCredentials {
    apiKey: string;
}

export interface CreatePaymentLinkInput {
    reference: string;        // notre identifiant unique du paiement
    amount: number;           // en MGA, minimum 300
    description: string;      // 255 caractères maximum
    clientName: string;
    payerEmail?: string;
    notificationUrl: string;  // l'adresse que Papi appellera pour confirmer
    successUrl?: string;      // affichage seulement : ne prouve JAMAIS un paiement
    failureUrl?: string;
    validDurationHours: number;
}

export interface PaymentLink {
    paymentUrl: string;        // l'adresse où envoyer le client
    notificationToken: string; // à comparer avec celui des notifications
    expiresAt: Date;
}

export interface PaymentGateway {
    createPaymentLink(credentials: GatewayCredentials, input: CreatePaymentLinkInput): Promise<PaymentLink>;
}
