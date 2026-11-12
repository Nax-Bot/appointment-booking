// Mêmes limites que le backend
export const PRICE_MAX = 99999999.99;
export const DURATION_MAX = 1440;
export const NAME_MIN = 2;
export const NAME_MAX = 150;

// Transforme le texte tapé en nombre : « 80 000 » ou « 80000,50 » donnent 80000 et 80000.5.
// Si le texte n'est pas un nombre positif, on renvoie null.
export function parseNumber(text: string): number | null {
    const cleaned = text.replace(/\s/g, "").replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(cleaned) === false) {
        return null;
    }
    return Number(cleaned);
}

// Chaque fonction renvoie le message d'erreur, ou "" si tout va bien
export function getPriceError(text: string): string {
    if (text.trim() === "") {
        return "Le prix est obligatoire";
    }

    const price = parseNumber(text);
    if (price === null) {
        return "Le prix doit être un nombre (ex. 50000)";
    }
    if (price <= 0) {
        return "Le prix doit être supérieur à 0";
    }
    if (price > PRICE_MAX) {
        return "Le prix est trop élevé";
    }
    return "";
}

export function getDurationError(text: string): string {
    if (text.trim() === "") {
        return "La durée est obligatoire";
    }

    const duration = parseNumber(text);
    if (duration === null || Number.isInteger(duration) === false) {
        return "La durée doit être un nombre entier de minutes";
    }
    if (duration < 1) {
        return "La durée doit être d'au moins 1 minute";
    }
    if (duration > DURATION_MAX) {
        return "La durée ne peut pas dépasser 1440 minutes (24 heures)";
    }
    return "";
}

export function getNameError(text: string): string {
    const length = text.trim().length;
    if (length < NAME_MIN) {
        return "Le nom doit contenir au moins 2 caractères";
    }
    if (length > NAME_MAX) {
        return "Le nom est trop long (150 caractères maximum)";
    }
    return "";
}