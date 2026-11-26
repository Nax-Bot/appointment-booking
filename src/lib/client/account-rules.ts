// Règles du compte que le front doit connaître pour bien les expliquer.
// Elles reprennent celles du backend (lib/server/auth/account-rules.ts) : le backend reste le juge final.

// Un code de réinitialisation est valable 15 minutes
export const RESET_CODE_LIFETIME_MINUTES = 15;

// On peut changer son nom ou son prénom une fois tous les 30 jours (le téléphone est libre)
export const NAME_CHANGE_COOLDOWN_DAYS = 30;

// Pas de nouvelle demande de code avant ce délai (affichage seulement ; le vrai plafond est côté serveur : 3 e-mails par heure)
export const RESET_RESEND_DELAY_SECONDS = 60;
