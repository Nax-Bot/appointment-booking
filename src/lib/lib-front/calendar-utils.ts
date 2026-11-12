import { Availability, Unavailability } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import { dayOfWeekOfDateText, localMidnightToUtc } from "@/lib/datetime";
import { addDays } from "@/lib/lib-front/unavailability-format";
import { getDayOrder } from "@/lib/lib-front/days";

// Tout le calendrier travaille en heure locale de Madagascar, avec des dates « AAAA-MM-JJ »
// et des heures exprimées en MINUTES depuis minuit (09:30 = 570).

export const HOUR_PX = 64; // hauteur d'une heure dans la grille
export const DAY_MINUTES = 24 * 60;

export type CalendarView = "month" | "week" | "day";

// « 09:30 » -> 570
export function timeToMinutes(time: string): number {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
}

// 570 -> « 09:30 » (1440 s'écrit « 24:00 » : on le borne à 23:59 pour les formulaires)
export function minutesToClock(minutes: number): string {
    const safe = Math.min(Math.max(minutes, 0), DAY_MINUTES - 1);
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;
    return String(hours).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

// Le lundi de la semaine qui contient cette date
export function startOfWeek(date: string): string {
    return addDays(date, -getDayOrder(dayOfWeekOfDateText(date)));
}

// Les 7 dates d'une semaine, du lundi au dimanche
export function getWeekDates(date: string): string[] {
    const monday = startOfWeek(date);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
        dates.push(addDays(monday, i));
    }
    return dates;
}

// « 2026-11-10 » -> « 2026-11 »
export function monthKey(date: string): string {
    return date.substring(0, 7);
}

// Les dates affichées dans la grille d'un mois : des semaines complètes, du lundi au dimanche
export function getMonthDates(date: string): string[] {
    const first = monthKey(date) + "-01";
    const nextMonthFirst = shiftMonth(first, 1);
    const lastDay = addDays(nextMonthFirst, -1);

    const gridStart = startOfWeek(first);
    const gridEnd = addDays(startOfWeek(lastDay), 6);

    const dates: string[] = [];
    let current = gridStart;
    while (current <= gridEnd) {
        dates.push(current);
        current = addDays(current, 1);
    }
    return dates;
}

// Le 1er du mois d'avant (-1) ou d'après (+1)
export function shiftMonth(date: string, count: number): string {
    const year = Number(date.substring(0, 4));
    const month = Number(date.substring(5, 7));
    const moved = new Date(Date.UTC(year, month - 1 + count, 1));
    return moved.toISOString().substring(0, 10);
}

// Avance ou recule selon la vue : 1 jour, 1 semaine ou 1 mois
export function shiftDate(view: CalendarView, date: string, direction: number): string {
    if (view === "day") {
        return addDays(date, direction);
    }
    if (view === "week") {
        return addDays(date, direction * 7);
    }
    return shiftMonth(date, direction);
}

function formatUtc(date: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(
        new Date(date + "T00:00:00.000Z")
    );
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Le titre de la barre du haut : « Novembre 2026 », « 9 – 15 novembre 2026 », « Mardi 10 novembre 2026 »
export function getCalendarTitle(view: CalendarView, date: string): string {
    if (view === "month") {
        return capitalize(formatUtc(date, { month: "long", year: "numeric" }));
    }
    if (view === "day") {
        return capitalize(formatUtc(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    }
    const dates = getWeekDates(date);
    const first = dates[0];
    const last = dates[6];
    if (monthKey(first) === monthKey(last)) {
        return (
            formatUtc(first, { day: "numeric" }) +
            " – " +
            formatUtc(last, { day: "numeric", month: "long", year: "numeric" })
        );
    }
    return (
        formatUtc(first, { day: "numeric", month: "short" }) +
        " – " +
        formatUtc(last, { day: "numeric", month: "short", year: "numeric" })
    );
}

// « Lun » et « 10 » pour l'en-tête d'une colonne
export function getDayHeader(date: string): { weekday: string; dayNumber: string } {
    return {
        weekday: capitalize(formatUtc(date, { weekday: "short" }).replace(".", "")),
        dayNumber: formatUtc(date, { day: "numeric" }),
    };
}

// « Mardi 10 novembre » pour les fenêtres
export function getShortLongDate(date: string): string {
    return capitalize(formatUtc(date, { weekday: "long", day: "numeric", month: "long" }));
}

// ---------------------------------------------------------------------------
// Ce qui se passe un jour donné : des segments [start, end[ en minutes depuis minuit
// ---------------------------------------------------------------------------

export interface DaySegment<T> {
    start: number;
    end: number;
    data: T;
}

// Une plage horaire récurrente s'applique-t-elle à cette date ?
function availabilityAppliesOn(item: Availability, date: string): boolean {
    if (item.dayOfWeek !== dayOfWeekOfDateText(date)) {
        return false;
    }
    if (item.validFrom !== null && date < item.validFrom) {
        return false;
    }
    if (item.validTo !== null && date > item.validTo) {
        return false;
    }
    return true;
}

export function availabilitiesOnDate(items: Availability[], date: string): DaySegment<Availability>[] {
    const segments: DaySegment<Availability>[] = [];
    for (const item of items) {
        if (availabilityAppliesOn(item, date)) {
            segments.push({ start: timeToMinutes(item.startTime), end: timeToMinutes(item.endTime), data: item });
        }
    }
    segments.sort((a, b) => a.start - b.start);
    return segments;
}

// La partie d'un intervalle UTC qui tombe dans cette journée locale (null si aucune)
function clipToDate(startIso: string, endIso: string, date: string): { start: number; end: number } | null {
    const dayStart = localMidnightToUtc(date).getTime();
    const dayEnd = dayStart + DAY_MINUTES * 60 * 1000;

    const start = Math.max(new Date(startIso).getTime(), dayStart);
    const end = Math.min(new Date(endIso).getTime(), dayEnd);
    if (end <= start) {
        return null;
    }
    return {
        start: Math.round((start - dayStart) / 60000),
        end: Math.round((end - dayStart) / 60000),
    };
}

export function absencesOnDate(items: Unavailability[], date: string): DaySegment<Unavailability>[] {
    const segments: DaySegment<Unavailability>[] = [];
    for (const item of items) {
        const clipped = clipToDate(item.startDatetime, item.endDatetime, date);
        if (clipped !== null) {
            segments.push({ start: clipped.start, end: clipped.end, data: item });
        }
    }
    segments.sort((a, b) => a.start - b.start);
    return segments;
}

export function appointmentsOnDate(
    items: AppointmentDetail[],
    date: string,
    showCancelled: boolean
): DaySegment<AppointmentDetail>[] {
    const segments: DaySegment<AppointmentDetail>[] = [];
    for (const item of items) {
        if (item.status === "CANCELLED" && showCancelled === false) {
            continue;
        }
        const clipped = clipToDate(item.startDatetime, item.endDatetime, date);
        if (clipped !== null) {
            segments.push({ start: clipped.start, end: clipped.end, data: item });
        }
    }
    segments.sort((a, b) => a.start - b.start);
    return segments;
}

// Un segment placé dans une « voie » : deux rendez-vous qui se chevauchent s'affichent côte à côte
export interface LaneSegment<T> extends DaySegment<T> {
    lane: number;
    lanes: number;
}

export function layoutLanes<T>(segments: DaySegment<T>[]): LaneSegment<T>[] {
    const result: LaneSegment<T>[] = [];
    let cluster: LaneSegment<T>[] = [];
    let laneEnds: number[] = [];
    let clusterEnd = -1;

    function closeCluster() {
        for (const segment of cluster) {
            segment.lanes = laneEnds.length;
        }
        result.push(...cluster);
        cluster = [];
        laneEnds = [];
    }

    for (const segment of segments) {
        if (cluster.length > 0 && segment.start >= clusterEnd) {
            closeCluster();
        }

        let lane = laneEnds.findIndex((end) => end <= segment.start);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(segment.end);
        } else {
            laneEnds[lane] = segment.end;
        }

        cluster.push({ ...segment, lane: lane, lanes: 1 });
        clusterEnd = cluster.length === 1 ? segment.end : Math.max(clusterEnd, segment.end);
    }
    closeCluster();

    return result;
}

// Le nom à afficher sur un rendez-vous : « Marie Rakoto »
export function clientName(item: AppointmentDetail): string {
    return item.client.firstName + " " + item.client.lastName;
}
