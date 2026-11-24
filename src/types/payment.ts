// Les types du paiement en ligne (Papi).
// Les clés secrètes (clé API, secret de signature) partent vers le backend, mais ne reviennent JAMAIS.

// GET /api/professionals/me/payment-account : ma boutique est-elle configurée ?
export interface PaymentAccountStatus {
    configured: boolean;
    boutiqueCode: string | null;
}

// Les données envoyées pour enregistrer sa boutique (PUT /api/professionals/me/payment-account)
export interface SetupPaymentAccountInput {
    boutiqueCode: string;
    apiKey: string;
    // « pwhsec_ » suivi de 64 caractères hexadécimaux
    webhookSecret: string;
}

// Ce que renvoie l'enregistrement de la boutique (sans aucune clé)
export interface PaymentAccountResult {
    id: number;
    boutiqueCode: string;
    status: string;
}

// POST /api/appointments/[id]/pay : le lien pour payer
// expiresAt = fin de validité du lien (ISO, UTC) ; amount en Ariary (MGA)
export interface StartPaymentResult {
    paymentUrl: string;
    expiresAt: string;
    amount: number;
}

// POST /api/appointments/[id]/outcome : le professionnel clôture le rendez-vous
export type AppointmentOutcome = "COMPLETED" | "NO_SHOW";

export interface MarkOutcomeInput {
    status: AppointmentOutcome;
}
