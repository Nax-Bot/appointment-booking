// Madagascar : UTC+3 toute l'année (pas de changement d'heure)
export const LOCAL_OFFSET_MINUTES = 180;

// Un instant vu en heure locale
export interface LocalMoment {
    dateText: string; // "AAAA-MM-JJ" (date locale)
    dayOfWeek: number; // 0 = dimanche ... 6 = samedi (jour local)
    minutes: number; // minutes écoulées depuis minuit (heure locale)
}

// Convertit un instant (UTC) en date, jour de la semaine et minutes locaux
export function toLocalMoment(date: Date): LocalMoment {
    const shifted = new Date(date.getTime() + LOCAL_OFFSET_MINUTES * 60 * 1000);

    return {
        dateText: shifted.toISOString().substring(0, 10),
        dayOfWeek: shifted.getUTCDay(),
        minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    };
}

// Colonne Time de la base (une Date du 1er janvier 1970 en UTC) -> minutes depuis minuit
export function timeColumnToMinutes(time: Date): number {
    return time.getUTCHours() * 60 + time.getUTCMinutes();
}

// Colonne Date de la base -> "AAAA-MM-JJ"
export function dateColumnToText(date: Date): string {
    return date.toISOString().substring(0, 10);
}

// Vrai si le texte "AAAA-MM-JJ" est une date qui existe vraiment (faux pour 2026-02-31)
export function isRealDateText(text: string): boolean {
    const date = new Date(text + "T00:00:00.000Z");

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return date.toISOString().substring(0, 10) === text;
}

// Jour de la semaine d'une date locale "AAAA-MM-JJ" (0 = dimanche ... 6 = samedi)
export function dayOfWeekOfDateText(text: string): number {
    return new Date(text + "T00:00:00.000Z").getUTCDay();
}

// L'instant UTC qui correspond à minuit (heure locale) au début de cette date
export function localMidnightToUtc(text: string): Date {
    const midnightAsUtc = new Date(text + "T00:00:00.000Z");
    return new Date(midnightAsUtc.getTime() - LOCAL_OFFSET_MINUTES * 60 * 1000);
}

// Minutes depuis minuit -> "HH:mm" (par exemple 540 devient "09:00")
export function minutesToText(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return String(hours).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}