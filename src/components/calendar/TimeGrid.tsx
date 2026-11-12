"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Availability, Unavailability } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import {
    DAY_MINUTES,
    HOUR_PX,
    absencesOnDate,
    appointmentsOnDate,
    availabilitiesOnDate,
    clientName,
    getDayHeader,
    layoutLanes,
    minutesToClock,
} from "@/lib/lib-front/calendar-utils";
import { ABSENCE_STRIPES, TONES, isMutedStatus, toneOf } from "@/lib/lib-front/calendar-theme";
import StatusIcon from "@/components/calendar/StatusIcon";

// La grille « heures » des vues Semaine (7 colonnes) et Jour (1 colonne).
interface TimeGridProps {
    dates: string[];
    today: string;
    nowMinutes: number;
    availabilities: Availability[];
    absences: Unavailability[];
    appointments: AppointmentDetail[];
    showCancelled: boolean;
    onSlotClick: (date: string, minutes: number) => void;
    onAppointmentClick: (item: AppointmentDetail) => void;
    onAbsenceClick: (item: Unavailability) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const SLOT_MINUTES = 30; // un clic tombe sur une demi-heure
const GUTTER = "3.5rem"; // largeur de la colonne des heures

// Une ligne par heure, une ligne plus claire par demi-heure
const GRID_LINES = {
    backgroundImage:
        "linear-gradient(to bottom, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,231,235,0.6) 1px, transparent 1px)",
    backgroundSize: "100% " + HOUR_PX + "px, 100% " + HOUR_PX / 2 + "px",
};

export default function TimeGrid({
    dates,
    today,
    nowMinutes,
    availabilities,
    absences,
    appointments,
    showCancelled,
    onSlotClick,
    onAppointmentClick,
    onAbsenceClick,
}: TimeGridProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const columns = GUTTER + " repeat(" + dates.length + ", minmax(0, 1fr))";
    const isDayView = dates.length === 1;

    // Le créneau survolé : on y dessine un aperçu « + 10:30 »
    const [hover, setHover] = useState<{ date: string; minutes: number } | null>(null);

    // À l'ouverture, on fait défiler jusqu'à 7 h : on ne montre pas la nuit
    useEffect(() => {
        if (scrollRef.current !== null) {
            scrollRef.current.scrollTop = 7 * HOUR_PX - 12;
        }
    }, []);

    function slotFromEvent(event: React.MouseEvent<HTMLDivElement>): number {
        const rect = event.currentTarget.getBoundingClientRect();
        const raw = ((event.clientY - rect.top) / HOUR_PX) * 60;
        return Math.min(Math.floor(raw / SLOT_MINUTES) * SLOT_MINUTES, DAY_MINUTES - SLOT_MINUTES);
    }

    function handleMove(event: React.MouseEvent<HTMLDivElement>, date: string) {
        // Sur un événement (rendez-vous, absence), pas d'aperçu : il a son propre survol
        if (event.target !== event.currentTarget) {
            setHover(null);
            return;
        }
        setHover({ date: date, minutes: slotFromEvent(event) });
    }

    return (
        <div className="overflow-x-auto">
            <div className={isDayView ? "" : "min-w-[760px]"}>
                {/* En-têtes des jours */}
                <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
                    <div />
                    {dates.map((date) => {
                        const header = getDayHeader(date);
                        const isToday = date === today;
                        return (
                            <div
                                key={date}
                                className={
                                    "flex items-center justify-center gap-2 border-l border-line py-2.5 " +
                                    (isToday ? "bg-tint" : "")
                                }
                            >
                                <span
                                    className={
                                        "text-[11px] font-medium tracking-wider uppercase " +
                                        (isToday ? "text-primary" : "text-muted")
                                    }
                                >
                                    {header.weekday}
                                </span>
                                <span
                                    className={
                                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-semibold tabular-nums " +
                                        (isToday ? "bg-primary text-white shadow-sm" : "text-ink")
                                    }
                                >
                                    {header.dayNumber}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* La grille, qui défile verticalement */}
                <div ref={scrollRef} className="max-h-[64vh] overflow-y-auto">
                    <div className="grid" style={{ gridTemplateColumns: columns, height: 24 * HOUR_PX }}>
                        {/* Les heures, alignées sur leur ligne */}
                        <div className="relative">
                            {HOURS.map((hour) =>
                                hour === 0 ? null : (
                                    <span
                                        key={hour}
                                        className="absolute right-2.5 -translate-y-1/2 text-[11px] text-muted tabular-nums"
                                        style={{ top: hour * HOUR_PX }}
                                    >
                                        {String(hour).padStart(2, "0")}:00
                                    </span>
                                )
                            )}
                        </div>

                        {dates.map((date) => {
                            const dispo = availabilitiesOnDate(availabilities, date);
                            const absents = absencesOnDate(absences, date);
                            const rdvs = layoutLanes(appointmentsOnDate(appointments, date, showCancelled));
                            const isToday = date === today;

                            return (
                                <div
                                    key={date}
                                    onClick={(event) => {
                                        onSlotClick(date, slotFromEvent(event));
                                    }}
                                    onMouseMove={(event) => handleMove(event, date)}
                                    onMouseLeave={() => setHover(null)}
                                    className={
                                        "relative cursor-pointer border-l border-line " +
                                        (isToday ? "bg-tint/55" : "")
                                    }
                                    style={GRID_LINES}
                                >
                                    {/* Disponibilités : fond doux, à plat (elles ne se cliquent pas : on clique à travers) */}
                                    {dispo.map((segment) => (
                                        <div
                                            key={"a" + segment.data.id}
                                            className={
                                                "pointer-events-none absolute inset-x-0.5 overflow-hidden rounded-lg " +
                                                TONES.availability.block
                                            }
                                            style={{
                                                top: (segment.start / 60) * HOUR_PX + 1,
                                                height: ((segment.end - segment.start) / 60) * HOUR_PX - 2,
                                            }}
                                        >
                                            <span className="flex items-center gap-1 px-2 pt-1.5 text-[10.5px] font-medium opacity-80">
                                                <span className={"h-1.5 w-1.5 rounded-full " + TONES.availability.dot} />
                                                {isDayView
                                                    ? "Disponible · " + segment.data.startTime + " – " + segment.data.endTime
                                                    : segment.data.startTime + " – " + segment.data.endTime}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Aperçu du créneau survolé */}
                                    {hover !== null && hover.date === date && (
                                        <div
                                            className="pointer-events-none absolute inset-x-1 z-10 flex items-center gap-1 rounded-lg border border-dashed border-primary/50 bg-white/80 px-2 text-[11px] font-medium text-primary shadow-sm"
                                            style={{
                                                top: (hover.minutes / 60) * HOUR_PX + 1,
                                                height: (SLOT_MINUTES / 60) * HOUR_PX - 2,
                                            }}
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span className="tabular-nums">{minutesToClock(hover.minutes)}</span>
                                        </div>
                                    )}

                                    {/* Absences : fond rosé rayé */}
                                    {absents.map((segment, index) => (
                                        <button
                                            type="button"
                                            key={"u" + segment.data.id + "-" + segment.start}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onAbsenceClick(segment.data);
                                            }}
                                            title={segment.data.reason !== null ? segment.data.reason : "Absence"}
                                            className={
                                                "animate-pop-in absolute inset-x-0.5 z-10 overflow-hidden rounded-lg text-left ring-1 ring-inset ring-[#BE123C]/15 transition-all duration-150 hover:-translate-y-px hover:shadow-md hover:ring-[#BE123C]/35 focus-visible:ring-2 focus-visible:ring-[#BE123C]/50 focus-visible:outline-none " +
                                                TONES.absence.block
                                            }
                                            style={{
                                                ...ABSENCE_STRIPES,
                                                animationDelay: index * 40 + "ms",
                                                top: (segment.start / 60) * HOUR_PX + 1,
                                                height: ((segment.end - segment.start) / 60) * HOUR_PX - 2,
                                            }}
                                        >
                                            <span className="flex items-center gap-1 px-2 pt-1.5 text-[11px] font-semibold">
                                                <StatusIcon status="absence" />
                                                <span className="truncate">
                                                    Absent{segment.data.reason !== null ? " · " + segment.data.reason : ""}
                                                </span>
                                            </span>
                                        </button>
                                    ))}

                                    {/* Rendez-vous : blocs avec barre d'accent, icône de statut et ombre légère */}
                                    {rdvs.map((segment, index) => {
                                        const tone = toneOf(segment.data.status);
                                        const muted = isMutedStatus(segment.data.status);
                                        const height = Math.max(((segment.end - segment.start) / 60) * HOUR_PX - 3, 20);
                                        const widthPercent = 100 / segment.lanes;
                                        const timeText =
                                            minutesToClock(segment.start) + " – " + minutesToClock(segment.end);
                                        const showTwoLines = height >= 40;
                                        const showService = height >= (isDayView ? 56 : 76);

                                        return (
                                            <button
                                                type="button"
                                                key={"r" + segment.data.id + "-" + segment.start}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onAppointmentClick(segment.data);
                                                }}
                                                title={clientName(segment.data) + " · " + segment.data.service.name + " · " + timeText}
                                                className={
                                                    "animate-pop-in absolute z-20 overflow-hidden rounded-lg border-l-[3px] text-left shadow-[0_1px_2px_rgba(17,24,39,0.10)] transition-all duration-150 hover:z-30 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(17,24,39,0.16)] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none " +
                                                    tone.block +
                                                    " " +
                                                    tone.bar +
                                                    (muted ? " opacity-80" : "")
                                                }
                                                style={{
                                                    animationDelay: index * 40 + "ms",
                                                    top: (segment.start / 60) * HOUR_PX + 1.5,
                                                    height: height,
                                                    left: "calc(" + segment.lane * widthPercent + "% + 3px)",
                                                    width: "calc(" + widthPercent + "% - 6px)",
                                                }}
                                            >
                                                {showTwoLines ? (
                                                    <span className="block px-2 py-1.5">
                                                        <span className="flex items-center gap-1 text-[10.5px] font-medium tabular-nums opacity-80">
                                                            <StatusIcon status={segment.data.status} className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{timeText}</span>
                                                        </span>
                                                        <span
                                                            className={
                                                                "mt-0.5 block truncate font-semibold " +
                                                                (isDayView ? "text-[13px]" : "text-xs") +
                                                                (muted ? " line-through" : "")
                                                            }
                                                        >
                                                            {clientName(segment.data)}
                                                        </span>
                                                        {showService && (
                                                            <span className="block truncate text-[11px] opacity-75">
                                                                {segment.data.service.name}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 text-[11px]">
                                                        <StatusIcon status={segment.data.status} className="h-3 w-3 shrink-0" />
                                                        <span className="truncate font-semibold">
                                                            {minutesToClock(segment.start)} · {clientName(segment.data)}
                                                        </span>
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {/* La ligne de l'heure actuelle */}
                                    {isToday && (
                                        <div
                                            className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                                            style={{ top: (nowMinutes / 60) * HOUR_PX }}
                                        >
                                            <span className="-ml-[5px] h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
                                            <span className="h-px flex-1 bg-primary" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
