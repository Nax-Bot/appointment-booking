// Règles communes au paiement et aux rendez-vous.

// Durée de validité d'un lien de paiement (en heures)
export const PAYMENT_LINK_HOURS = 1;

// Un rendez-vous réservé mais non payé garde son créneau pendant ce temps (en minutes).
// Doit être au moins égal à la validité du lien : on ne libère jamais un créneau
// dont le client peut encore payer.
export const UNPAID_HOLD_MINUTES = PAYMENT_LINK_HOURS * 60;

// Raison enregistrée quand un rendez-vous non payé est libéré
export const UNPAID_CANCEL_REASON = "Paiement non effectué dans le délai";
