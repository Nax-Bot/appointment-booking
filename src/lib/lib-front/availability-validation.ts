// Mêmes formats que le backend
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE_PATTERN = /^(19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}$/;

// Chaque fonction renvoie le message d'erreur, ou "" si tout va bien

export function getStartTimeError(start: string): string {
    if (start === "") {
        return "L'heure de début est obligatoire";
    }
    if (TIME_PATTERN.test(start) === false) {
        return "L'heure de début doit être au format HH:mm";
    }
    return "";
}

export function getEndTimeError(start: string, end: string): string {
    if (end === "") {
        return "L'heure de fin est obligatoire";
    }
    if (TIME_PATTERN.test(end) === false) {
        return "L'heure de fin doit être au format HH:mm";
    }
    // Les heures "HH:mm" se comparent comme du texte
    if (TIME_PATTERN.test(start) && end <= start) {
        return "L'heure de fin doit être après l'heure de début";
    }
    return "";
}

// Une date de validité est facultative : vide = pas d'erreur
export function getDateError(date: string): string {
    if (date === "") {
        return "";
    }
    if (DATE_PATTERN.test(date) === false) {
        return "La date doit être comprise entre 1900 et 2099";
    }
    // On refuse les dates qui n'existent pas (ex. 2026-02-31)
    const parsed = new Date(date + "T00:00:00.000Z");
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().substring(0, 10) !== date) {
        return "Cette date n'existe pas";
    }
    return "";
}

// La fin de validité ne peut pas être avant le début de validité
export function getValidToError(validFrom: string, validTo: string): string {
    const ownError = getDateError(validTo);
    if (ownError !== "") {
        return ownError;
    }
    if (validFrom !== "" && validTo !== "" && getDateError(validFrom) === "" && validTo < validFrom) {
        return "La fin de validité ne peut pas être avant le début de validité";
    }
    return "";
}