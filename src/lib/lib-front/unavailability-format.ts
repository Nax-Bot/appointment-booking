import { LOCAL_OFFSET_MINUTES, minutesToText, toLocalMoment } from "@/lib/datetime";
import { Unavailability } from "@/types/api";

const DAY_MS = 24 * 60 * 60 * 1000;

// Un instant UTC vu en heure de Madagascar : date "AAAA-MM-JJ" et heure "HH:mm"
export interface LocalParts {
    dateText: string;
    timeText: string;
}

// « 2026-11-15T21:00:00.000Z » devient { dateText: "2026-11-16", timeText: "00:00" }
export function toLocalParts(iso: string): LocalParts {
    const moment = toLocalMoment(new Date(iso));
    return {
        dateText: moment.dateText,
        timeText: minutesToText(moment.minutes),
    };
}

// Date et heure saisies (heure de Madagascar) -> instant UTC au format ISO,
// accepté par le backend : « 2026-11-16 » + « 00:00 » donne « 2026-11-15T21:00:00.000Z »
export function localToIso(dateText: string, timeText: string): string {
    const asUtc = new Date(dateText + "T" + timeText + ":00.000Z");
    return new Date(asUtc.getTime() - LOCAL_OFFSET_MINUTES * 60 * 1000).toISOString();
}

// « 2026-11-16 » + 1 jour donne « 2026-11-17 »
export function addDays(dateText: string, days: number): string {
    const date = new Date(dateText + "T00:00:00.000Z");
    return new Date(date.getTime() + days * DAY_MS).toISOString().substring(0, 10);
}

// Nombre de jours entre deux dates : « 2026-11-23 » et « 2026-11-28 » donnent 5
function daysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T00:00:00.000Z");
    return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

// « 2026-11-16 » devient « Lundi 16 novembre 2026 » (ou « lundi 16 novembre 2026 »
// si capitalize vaut false, pour l'utiliser au milieu d'une phrase)
export function formatLongDate(dateText: string, capitalize: boolean = true): string {
    const date = new Date(dateText + "T00:00:00.000Z");
    const text = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);

    if (capitalize) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    return text;
}

// Une absence décomposée en heure locale
export interface AbsenceParts {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    // Vrai si elle va de minuit à minuit : c'est une ou plusieurs journées entières
    allDay: boolean;
    // Le dernier jour INCLUS (pour une journée entière : la veille de la date de fin)
    lastDay: string;
}

export function getAbsenceParts(item: Unavailability): AbsenceParts {
    const start = toLocalParts(item.startDatetime);
    const end = toLocalParts(item.endDatetime);

    const allDay = start.timeText === "00:00" && end.timeText === "00:00";

    let lastDay = end.dateText;
    if (allDay) {
        lastDay = addDays(end.dateText, -1);
    }

    return {
        startDate: start.dateText,
        startTime: start.timeText,
        endDate: end.dateText,
        endTime: end.timeText,
        allDay: allDay,
        lastDay: lastDay,
    };
}

// Les textes d'une carte : un titre, une ligne en dessous (parfois vide) et un badge
export interface AbsenceDescription {
    title: string;
    subtitle: string;
    badge: string;
}

export function describeAbsence(item: Unavailability): AbsenceDescription {
    const parts = getAbsenceParts(item);

    // Une ou plusieurs journées entières
    if (parts.allDay) {
        const dayCount = daysBetween(parts.startDate, parts.endDate);
        if (dayCount === 1) {
            return {
                title: formatLongDate(parts.startDate),
                subtitle: "",
                badge: "Journée entière",
            };
        }
        return {
            title: formatLongDate(parts.startDate),
            subtitle: "au " + formatLongDate(parts.lastDay, false),
            badge: dayCount + " jours",
        };
    }

    // Quelques heures le même jour
    if (parts.startDate === parts.endDate) {
        return {
            title: formatLongDate(parts.startDate),
            subtitle: "",
            badge: parts.startTime + " – " + parts.endTime,
        };
    }

    // Plusieurs jours, avec des heures de début et de fin
    const dayCount = daysBetween(parts.startDate, parts.endDate) + 1;
    return {
        title: formatLongDate(parts.startDate) + " · " + parts.startTime,
        subtitle: "au " + formatLongDate(parts.endDate, false) + " · " + parts.endTime,
        badge: dayCount + " jours",
    };
}