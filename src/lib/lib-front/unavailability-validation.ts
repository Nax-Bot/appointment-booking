import { getDateError } from "@/lib/lib-front/availability-validation";

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const REASON_MAX = 255;

// Chaque fonction renvoie le message d'erreur, ou "" si tout va bien

// label = par exemple « La date de début »
export function getRequiredDateError(label: string, date: string): string {
    if (date === "") {
        return label + " est obligatoire";
    }
    return getDateError(date);
}

// label = par exemple « L'heure de début »
export function getRequiredTimeError(label: string, time: string): string {
    if (time === "") {
        return label + " est obligatoire";
    }
    if (TIME_PATTERN.test(time) === false) {
        return label + " doit être au format HH:mm";
    }
    return "";
}

// La fin doit être après le début.
// On ne compare que si les champs sont remplis : sinon c'est leur propre message qui s'affiche.
export function getPeriodError(
    allDay: boolean,
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string
): string {
    if (startDate === "" || endDate === "") {
        return "";
    }

    // Journées entières : le dernier jour peut être le même que le premier, jamais avant
    if (allDay) {
        if (endDate < startDate) {
            return "La date de fin ne peut pas être avant la date de début";
        }
        return "";
    }

    if (startTime === "" || endTime === "") {
        return "";
    }

    // Les textes « AAAA-MM-JJTHH:mm » se comparent comme des dates
    const start = startDate + "T" + startTime;
    const end = endDate + "T" + endTime;
    if (end <= start) {
        return "La fin doit être après le début";
    }
    return "";
}

export function getReasonError(reason: string): string {
    if (reason.trim().length > REASON_MAX) {
        return "Le motif est trop long (255 caractères maximum)";
    }
    return "";
}