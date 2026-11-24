// Les règles de paiement que le front doit connaître pour bien l'expliquer.
// Elles reprennent celles du backend (lib/server/payments/payment-rules.ts) :
// si le backend change, il faut changer ces valeurs aussi. Le backend reste le juge final.

// Un rendez-vous réservé mais non payé garde son créneau pendant 1 heure, puis il est libéré
export const PAYMENT_HOLD_MINUTES = 60;

// Montant minimum pour payer en ligne (en Ariary)
export const MIN_ONLINE_AMOUNT = 300;

// Le secret de signature Papi : « pwhsec_ » + 64 caractères hexadécimaux
export const WEBHOOK_SECRET_PATTERN = /^pwhsec_[0-9a-f]{64}$/;
