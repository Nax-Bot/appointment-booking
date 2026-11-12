"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/lib-front/api-client";
import { Availability } from "@/types/api";
import { Slot, SlotsResult } from "@/types/booking";
import { getTodayLocalDate } from "@/lib/lib-front/booking-format";
import { minutesToText } from "@/lib/datetime";

const SLOT_STEP_MINUTES = 15; // le backend propose un créneau toutes les 15 minutes
const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MAX_MONTHS_AHEAD = 6;
const BATCH_SIZE = 6; // nombre de jours chargés en même temps

interface BookingCalendarProps {
    professionalId: number;
    serviceId: string; // "" = aucun service choisi
    duration: number | null; // durée du service choisi (minutes)
    availabilities: Availability[]; // les horaires hebdomadaires du professionnel
    selectedDate: string; // "AAAA-MM-JJ" ou ""
    selectedStart: string; // instant UTC du créneau choisi, ou ""
    reloadKey: number; // change quand les créneaux doivent être rechargés
    onPickDate: (date: string) => void;
    onPickSlot: (date: string, slot: Slot) => void;
}

type DayStatus = "past" | "off" | "unknown" | "loading" | "free" | "full";

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function dateTextOf(year: number, month: number, day: number): string {
    return year + "-" + pad(month + 1) + "-" + pad(day);
}

function weekdayOf(dateText: string): number {
    return new Date(dateText + "T00:00:00.000Z").getUTCDay(); // 0 = dimanche
}

// « 08:30 » ou « 08:30:00 » -> 510
function textToMinutes(time: string): number {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
}

// Mini-calendrier de réservation : montre au client les jours où le professionnel travaille,
// ceux qui sont complets ou en absence, et les horaires libres du jour choisi.
export default function BookingCalendar({
    professionalId,
    serviceId,
    duration,
    availabilities,
    selectedDate,
    selectedStart,
    reloadKey,
    onPickDate,
    onPickSlot,
}: BookingCalendarProps) {
    const today = getTodayLocalDate();
    const todayYear = Number(today.substring(0, 4));
    const todayMonth = Number(today.substring(5, 7)) - 1;

    const [view, setView] = useState({ year: todayYear, month: todayMonth });

    // Quand le jour choisi change (ex. dans le champ date), le calendrier affiche son mois
    const [previousSelected, setPreviousSelected] = useState(selectedDate);
    if (selectedDate !== previousSelected) {
        setPreviousSelected(selectedDate);
        if (selectedDate !== "") {
            setView({
                year: Number(selectedDate.substring(0, 4)),
                month: Number(selectedDate.substring(5, 7)) - 1,
            });
        }
    }

    // Les créneaux libres déjà chargés, jour par jour (clé : rechargement|service|date).
    // « null » = le chargement de ce jour a échoué.
    const cache = useRef<Record<string, Slot[] | null>>({});
    const [, setTick] = useState(0);

    function cacheKey(date: string): string {
        return reloadKey + "|" + serviceId + "|" + date;
    }

    // Le professionnel travaille-t-il ce jour-là ? (horaires hebdomadaires + dates de validité)
    function isWorkingDay(dateText: string): boolean {
        const weekday = weekdayOf(dateText);
        for (const item of availabilities) {
            if (item.dayOfWeek !== weekday) {
                continue;
            }
            if (item.validFrom !== null && item.validFrom > dateText) {
                continue;
            }
            if (item.validTo !== null && item.validTo < dateText) {
                continue;
            }
            return true;
        }
        return false;
    }

    const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
    const startOffset = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7; // lundi = 0

    // Charge les créneaux libres des jours de travail du mois affiché (par petits groupes)
    useEffect(() => {
        if (serviceId === "") {
            return undefined;
        }

        const toLoad: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateText = dateTextOf(view.year, view.month, day);
            if (dateText < today || isWorkingDay(dateText) === false) {
                continue;
            }
            if (cache.current[reloadKey + "|" + serviceId + "|" + dateText] === undefined) {
                toLoad.push(dateText);
            }
        }
        if (toLoad.length === 0) {
            return undefined;
        }

        let cancelled = false;

        async function loadAll() {
            for (let i = 0; i < toLoad.length; i += BATCH_SIZE) {
                const batch = toLoad.slice(i, i + BATCH_SIZE);
                const results = await Promise.allSettled(
                    batch.map((dateText) =>
                        apiGet<SlotsResult>(
                            "/api/professionals/" +
                                professionalId +
                                "/slots?serviceId=" +
                                serviceId +
                                "&date=" +
                                dateText
                        )
                    )
                );
                if (cancelled) {
                    return;
                }
                results.forEach((result, index) => {
                    const key = reloadKey + "|" + serviceId + "|" + batch[index];
                    cache.current[key] = result.status === "fulfilled" ? result.value.slots : null;
                });
                setTick((value) => value + 1);
            }
        }
        loadAll();

        return () => {
            cancelled = true;
        };
        // isWorkingDay dépend seulement de availabilities
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [professionalId, serviceId, reloadKey, view.year, view.month, availabilities]);

    function statusOf(dateText: string): DayStatus {
        if (dateText < today) {
            return "past";
        }
        if (isWorkingDay(dateText) === false) {
            return "off";
        }
        if (serviceId === "") {
            return "unknown";
        }
        const slots = cache.current[cacheKey(dateText)];
        if (slots === undefined) {
            return "loading";
        }
        if (slots === null) {
            return "unknown";
        }
        return slots.length > 0 ? "free" : "full";
    }

    const monthLabel = new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(view.year, view.month, 1)));

    const monthsFromToday = (view.year - todayYear) * 12 + (view.month - todayMonth);

    function goToMonth(delta: number) {
        const date = new Date(Date.UTC(view.year, view.month + delta, 1));
        setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    }

    // Les horaires du jour choisi : libres (cliquables) et occupés (grisés)
    let dayTimes: { minutes: number; slot: Slot | null }[] = [];
    if (selectedDate !== "" && serviceId !== "" && duration !== null) {
        const free = cache.current[cacheKey(selectedDate)];
        if (free !== undefined && free !== null) {
            const freeByTime: Record<string, Slot> = {};
            free.forEach((slot) => {
                freeByTime[slot.startTime] = slot;
            });

            const minutesSet = new Set<number>();
            const weekday = weekdayOf(selectedDate);
            for (const item of availabilities) {
                if (item.dayOfWeek !== weekday) {
                    continue;
                }
                if (item.validFrom !== null && item.validFrom > selectedDate) {
                    continue;
                }
                if (item.validTo !== null && item.validTo < selectedDate) {
                    continue;
                }
                const end = textToMinutes(item.endTime);
                for (let m = textToMinutes(item.startTime); m + duration <= end; m += SLOT_STEP_MINUTES) {
                    minutesSet.add(m);
                }
            }
            dayTimes = Array.from(minutesSet)
                .sort((a, b) => a - b)
                .map((minutes) => ({ minutes, slot: freeByTime[minutesToText(minutes)] ?? null }));
        }
    }
    const freeCount = dayTimes.filter((item) => item.slot !== null).length;
    const selectedStatus = selectedDate !== "" ? statusOf(selectedDate) : "off";

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Disponibilités
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => goToMonth(-1)}
                        disabled={monthsFromToday <= 0}
                        aria-label="Mois précédent"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink transition-all hover:bg-tint active:scale-95 disabled:opacity-40 disabled:hover:bg-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-28 text-center text-sm font-medium text-ink capitalize">{monthLabel}</span>
                    <button
                        type="button"
                        onClick={() => goToMonth(1)}
                        disabled={monthsFromToday >= MAX_MONTHS_AHEAD}
                        aria-label="Mois suivant"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink transition-all hover:bg-tint active:scale-95 disabled:opacity-40 disabled:hover:bg-white"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
                {WEEK_LABELS.map((label, index) => (
                    <span key={index} className="py-1">
                        {label}
                    </span>
                ))}
            </div>

            {/* Les jours du mois */}
            <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, index) => (
                    <span key={"blank" + index} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const dateText = dateTextOf(view.year, view.month, day);
                    const status = statusOf(dateText);
                    const selected = dateText === selectedDate;
                    const clickable = status === "free" || status === "unknown";

                    let dayClass = "text-muted/40";
                    let title = "";
                    if (status === "off") {
                        dayClass = "text-muted/50";
                        title = "Ne travaille pas ce jour-là";
                    } else if (status === "loading") {
                        dayClass = "skeleton text-muted/50";
                    } else if (status === "full") {
                        dayClass = "bg-red-50 text-red-400";
                        title = "Complet ou absent";
                    } else if (status === "free") {
                        dayClass = "bg-tint font-semibold text-primary hover:bg-primary hover:text-white";
                        title = "Créneaux disponibles";
                    } else if (status === "unknown") {
                        dayClass = "border border-primary/25 text-ink hover:bg-tint";
                        title = "Jour de travail";
                    }
                    if (selected) {
                        dayClass = "bg-primary font-semibold text-white shadow-md shadow-primary/25";
                    }

                    return (
                        <button
                            key={dateText}
                            type="button"
                            disabled={clickable === false}
                            title={title}
                            aria-pressed={selected}
                            onClick={() => onPickDate(dateText)}
                            className={
                                "relative flex h-9 items-center justify-center rounded-xl text-sm transition-all duration-150 active:scale-95 disabled:cursor-default " +
                                dayClass +
                                (dateText === today && selected === false ? " ring-1 ring-primary/40" : "")
                            }
                        >
                            {day}
                            {status === "full" && (
                                <span className="absolute right-1 bottom-1 left-1 h-px bg-red-300" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Légende */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Disponible
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-300" /> Complet ou absent
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-200" /> Ne travaille pas
                </span>
            </div>

            {serviceId === "" && (
                <p className="mt-4 rounded-xl bg-tint p-3 text-xs text-ink">
                    Choisissez d&apos;abord un service : le calendrier montrera alors les jours
                    où il reste des créneaux libres.
                </p>
            )}

            {/* Les horaires du jour choisi */}
            {serviceId !== "" && selectedDate !== "" && selectedStatus !== "off" && selectedStatus !== "past" && (
                <div className="mt-5 border-t border-line pt-4">
                    <p className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wide text-muted uppercase">
                        <span>Horaires du {selectedDate.substring(8, 10)}/{selectedDate.substring(5, 7)}</span>
                        {dayTimes.length > 0 && (
                            <span className="font-normal normal-case">{freeCount} libre(s)</span>
                        )}
                    </p>
                    {dayTimes.length === 0 && (
                        <p className="text-xs text-muted">
                            {selectedStatus === "full" ? "Aucun créneau libre ce jour-là." : "Chargement..."}
                        </p>
                    )}
                    {dayTimes.length > 0 && (
                        <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                            {dayTimes.map((item) => {
                                const text = minutesToText(item.minutes);
                                if (item.slot === null) {
                                    return (
                                        <span
                                            key={text}
                                            title="Indisponible"
                                            className="rounded-full bg-gray-50 px-1 py-1.5 text-center text-xs text-muted/50 line-through"
                                        >
                                            {text}
                                        </span>
                                    );
                                }
                                const slot = item.slot;
                                const selected = slot.startDatetime === selectedStart;
                                return (
                                    <button
                                        key={text}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => onPickSlot(selectedDate, slot)}
                                        className={
                                            "rounded-full border px-1 py-1.5 text-xs font-medium transition-all active:scale-95 " +
                                            (selected
                                                ? "border-primary bg-primary text-white shadow-sm"
                                                : "border-line bg-white text-ink hover:border-primary/50 hover:bg-tint")
                                        }
                                    >
                                        {text}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
