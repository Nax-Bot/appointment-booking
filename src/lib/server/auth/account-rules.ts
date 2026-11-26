// Règles du compte : mot de passe oublié et modification du profil.

// Un code de réinitialisation est valable 15 minutes
export const RESET_CODE_LIFETIME_MINUTES = 15;

// Nombre d'essais permis pour un même code (comme pour la vérification de l'email)
export const MAX_RESET_ATTEMPTS = 5;

// On peut changer son nom ou son prénom une fois tous les 30 jours (le téléphone est libre)
export const NAME_CHANGE_COOLDOWN_DAYS = 30;
