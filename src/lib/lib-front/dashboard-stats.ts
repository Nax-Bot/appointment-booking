import { AppointmentDetail } from "@/types/booking";
import { addDays, toLocalParts } from "@/lib/lib-front/unavailability-format";
import { startOfWeek } from "@/lib/lib-front/calendar-utils";

// Les rendez-vous qui comptent dans la charge de travail (ni annulés, ni « non présenté »)
function isActive(item: AppointmentDetail): boolean {
    return item.status === "PENDING" || item.status === "CONFIRMED" || item.status === "COMPLETED";
}

function byStart(a: AppointmentDetail, b: AppointmentDetail): number {
    if (a.startDatetime < b.startDatetime) {
        return -1;
    }
    if (a.startDatetime > b.startDatetime) {
        return 1;
    }
    return 0;
}

// Un jour de la petite courbe « 7 prochains jours »
export interface DayActivity {
    date: string; // « 2026-11-16 »
    weekday: string; // « lun »
    dayNumber: number; // 16
    count: number;
    isToday: boolean;
}

export interface MonthStatusCounts {
    CONFIRMED: number;
    COMPLETED: number;
    PENDING: number;
    CANCELLED: number;
    NO_SHOW: number;
}

// Tout ce que le tableau de bord affiche, calculé à partir de la liste des rendez-vous
export interface DashboardStats {
    today: AppointmentDetail[]; // les rendez-vous du jour, dans l'ordre
    todayRemaining: number; // ceux qui ne sont pas encore terminés
    next: AppointmentDetail | null; // le prochain rendez-vous (aujourd'hui ou plus tard)
    pending: AppointmentDetail[]; // les demandes à confirmer (pas encore commencées)
    weekCount: number;
    monthCount: number;
    monthRevenue: number; // confirmés + terminés
    monthStatus: MonthStatusCounts;
    next7Days: DayActivity[];
}

// today = la date du jour (heure de Madagascar), now = l'instant actuel en millisecondes
export function computeDashboardStats(items: AppointmentDetail[], today: string, now: number): DashboardStats {
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const month = today.substring(0, 7);

    const todayItems: AppointmentDetail[] = [];
    const pending: AppointmentDetail[] = [];
    const upcomingActive: AppointmentDetail[] = [];
    let weekCount = 0;
    let monthCount = 0;
    let monthRevenue = 0;
    const monthStatus: MonthStatusCounts = { CONFIRMED: 0, COMPLETED: 0, PENDING: 0, CANCELLED: 0, NO_SHOW: 0 };

    const countByDate = new Map<string, number>();

    for (const item of items) {
        const startDate = toLocalParts(item.startDatetime).dateText;
        const startMs = new Date(item.startDatetime).getTime();
        const endMs = new Date(item.endDatetime).getTime();

        if (startDate.substring(0, 7) === month) {
            if (item.status in monthStatus) {
                monthStatus[item.status as keyof MonthStatusCounts] += 1;
            }
            if (isActive(item)) {
                monthCount += 1;
            }
            if (item.status === "CONFIRMED" || item.status === "COMPLETED") {
                if (item.priceAtBooking !== null) {
                    monthRevenue += item.priceAtBooking;
                }
            }
        }

        if (isActive(item) === false) {
            continue;
        }

        countByDate.set(startDate, (countByDate.get(startDate) ?? 0) + 1);

        if (startDate >= weekStart && startDate <= weekEnd) {
            weekCount += 1;
        }
        if (startDate === today) {
            todayItems.push(item);
        }
        if (item.status === "PENDING" && startMs > now) {
            pending.push(item);
        }
        if ((item.status === "PENDING" || item.status === "CONFIRMED") && endMs > now) {
            upcomingActive.push(item);
        }
    }

    todayItems.sort(byStart);
    pending.sort(byStart);
    upcomingActive.sort(byStart);

    let todayRemaining = 0;
    for (const item of todayItems) {
        if (new Date(item.endDatetime).getTime() > now) {
            todayRemaining += 1;
        }
    }

    const next7Days: DayActivity[] = [];
    for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const asDate = new Date(date + "T00:00:00.000Z");
        next7Days.push({
            date: date,
            weekday: new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" })
                .format(asDate)
                .replace(".", ""),
            dayNumber: asDate.getUTCDate(),
            count: countByDate.get(date) ?? 0,
            isToday: i === 0,
        });
    }

    return {
        today: todayItems,
        todayRemaining: todayRemaining,
        next: upcomingActive.length > 0 ? upcomingActive[0] : null,
        pending: pending,
        weekCount: weekCount,
        monthCount: monthCount,
        monthRevenue: monthRevenue,
        monthStatus: monthStatus,
        next7Days: next7Days,
    };
}
