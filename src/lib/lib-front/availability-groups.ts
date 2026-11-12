import { Availability } from "@/types/api";
import { WEEK_DAYS, getDayOrder } from "@/lib/lib-front/days";

// À partir de combien de jours qui se suivent on écrit « Lun – Jeu » au lieu de « Lun, Mar »
const MIN_RUN_FOR_RANGE = 3;

// Un groupe = des plages du backend (une par jour) qui ont exactement
// les mêmes heures ET la même période de validité
export interface AvailabilityGroup {
    key: string;
    startTime: string;
    endTime: string;
    validFrom: string | null;
    validTo: string | null;
    days: number[]; // les jours du groupe, rangés du lundi au dimanche
    items: Availability[]; // les plages du backend de ce groupe (une par jour)
}

function textOrEmpty(text: string | null): string {
    if (text === null) {
        return "";
    }
    return text;
}

// Regroupe les plages du backend : mêmes heures et même période = même groupe
export function groupAvailabilities(items: Availability[]): AvailabilityGroup[] {
    const groups: AvailabilityGroup[] = [];

    for (const item of items) {
        // Deux plages avec la même clé vont dans le même groupe
        const key =
            item.startTime +
            "|" +
            item.endTime +
            "|" +
            textOrEmpty(item.validFrom) +
            "|" +
            textOrEmpty(item.validTo);

        let found: AvailabilityGroup | null = null;
        for (const group of groups) {
            if (group.key === key) {
                found = group;
            }
        }

        if (found === null) {
            groups.push({
                key: key,
                startTime: item.startTime,
                endTime: item.endTime,
                validFrom: item.validFrom,
                validTo: item.validTo,
                days: [item.dayOfWeek],
                items: [item],
            });
        } else {
            found.days.push(item.dayOfWeek);
            found.items.push(item);
        }
    }

    // Dans chaque groupe : les jours du lundi au dimanche
    for (const group of groups) {
        group.days.sort((a, b) => getDayOrder(a) - getDayOrder(b));
        group.items.sort((a, b) => getDayOrder(a.dayOfWeek) - getDayOrder(b.dayOfWeek));
    }

    // Les groupes : par premier jour, puis par heure de début, puis par début de validité
    groups.sort((a, b) => {
        const dayA = getDayOrder(a.days[0]);
        const dayB = getDayOrder(b.days[0]);
        if (dayA !== dayB) {
            return dayA - dayB;
        }
        if (a.startTime !== b.startTime) {
            if (a.startTime < b.startTime) {
                return -1;
            }
            return 1;
        }
        if (a.endTime !== b.endTime) {
            if (a.endTime < b.endTime) {
                return -1;
            }
            return 1;
        }
        const fromA = textOrEmpty(a.validFrom);
        const fromB = textOrEmpty(b.validFrom);
        if (fromA < fromB) {
            return -1;
        }
        if (fromA > fromB) {
            return 1;
        }
        return 0;
    });

    return groups;
}

// Écrit les jours d'un groupe :
// [lundi, mardi, mercredi, jeudi] devient « Lun – Jeu »
// [lundi, mercredi, vendredi] devient « Lun, Mer, Ven »
export function formatDays(days: number[]): string {
    // On travaille avec la place de chaque jour dans la semaine (lundi = 0 ... dimanche = 6)
    const orders: number[] = [];
    for (const day of days) {
        orders.push(getDayOrder(day));
    }
    orders.sort((a, b) => a - b);

    const parts: string[] = [];
    let start = 0;

    while (start < orders.length) {
        // On cherche jusqu'où va la suite de jours qui se suivent
        let end = start;
        while (end + 1 < orders.length && orders[end + 1] === orders[end] + 1) {
            end = end + 1;
        }

        const runLength = end - start + 1;
        if (runLength >= MIN_RUN_FOR_RANGE) {
            parts.push(WEEK_DAYS[orders[start]].short + " – " + WEEK_DAYS[orders[end]].short);
        } else {
            for (let i = start; i <= end; i++) {
                parts.push(WEEK_DAYS[orders[i]].short);
            }
        }

        start = end + 1;
    }

    return parts.join(", ");
}

// « Lun – Jeu : 09:00 – 12:00 », pour les fenêtres de confirmation
export function describeGroup(group: AvailabilityGroup): string {
    return formatDays(group.days) + " : " + group.startTime + " – " + group.endTime;
}