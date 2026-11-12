"use client";

import { Availability, Unavailability } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import { WEEK_DAYS } from "@/lib/lib-front/days";
import {
    absencesOnDate,
    appointmentsOnDate,
    availabilitiesOnDate,
    clientName,
    getMonthDates,
    minutesToClock,
    monthKey,
} from "@/lib/lib-front/calendar-utils";
import { TONES, isMutedStatus, toneOf } from "@/lib/lib-front/calendar-theme";
import StatusIcon from "@/components/calendar/StatusIcon";

// La vue « Mois » : une case par jour, avec de petites pastilles compactes
// (sur téléphone : de simples points colorés).
interface MonthGridProps {
    anchorDate: string;
    today: string;
    availabilities: Availability[];
    absences: Unavailability[];
    appointments: AppointmentDetail[];
    showCancelled: boolean;
    onDayClick: (date: string) => void;
    onAppointmentClick: (item: AppointmentDetail) => void;
    onAbsenceClick: (item: Unavailability) => void;
}

const MAX_APPOINTMENTS_SHOWN = 3;
const MAX_DOTS = 6;

export default function MonthGrid({
    anchorDate,
    today,
    availabilities,
    absences,
    appointments,
    showCancelled,
    onDayClick,
    onAppointmentClick,
    onAbsenceClick,
}: MonthGridProps) {
    const dates = getMonthDates(anchorDate);
    const currentMonth = monthKey(anchorDate);

    return (
        <div>
            <div className="grid grid-cols-7 border-b border-line">
                {WEEK_DAYS.map((day) => (
                    <div
                        key={day.value}
                        className="py-2.5 text-center text-[11px] font-medium tracking-wider text-muted uppercase"
                    >
                        {day.short}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {dates.map((date, index) => {
                    const dispo = availabilitiesOnDate(availabilities, date);
                    const absents = absencesOnDate(absences, date);
                    const rdvs = appointmentsOnDate(appointments, date, showCancelled);
                    const isToday = date === today;
                    const inMonth = monthKey(date) === currentMonth;

                    // « 08:00–12:00 · 14:00–18:00 »
                    const dispoText = dispo
                        .map((segment) => segment.data.startTime + "–" + segment.data.endTime)
                        .join(" · ");

                    // Les points du téléphone : une couleur par événement
                    const dots: string[] = [];
                    if (dispo.length > 0) {
                        dots.push(TONES.availability.dot + " opacity-40");
                    }
                    for (let i = 0; i < absents.length; i++) {
                        dots.push(TONES.absence.dot);
                    }
                    for (const segment of rdvs) {
                        dots.push(toneOf(segment.data.status).dot);
                    }

                    return (
                        <div
                            key={date}
                            onClick={() => onDayClick(date)}
                            style={{ animationDelay: (index % 7) * 12 + "ms" }}
                            className={
                                "group animate-fade-in min-h-[4.75rem] cursor-pointer border-r border-b border-line p-1 transition-colors duration-150 hover:bg-tint/60 sm:min-h-[7.5rem] sm:p-1.5 [&:nth-child(7n)]:border-r-0 " +
                                (inMonth ? "bg-white" : "bg-page/70")
                            }
                        >
                            <div className="mb-1 flex items-center justify-center sm:justify-start">
                                <span
                                    className={
                                        "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums transition-colors " +
                                        (isToday
                                            ? "bg-primary text-white shadow-sm"
                                            : inMonth
                                              ? "text-ink group-hover:bg-white"
                                              : "text-muted/60")
                                    }
                                >
                                    {Number(date.substring(8, 10))}
                                </span>
                            </div>

                            {/* Téléphone : des points */}
                            <div className="flex flex-wrap justify-center gap-1 sm:hidden">
                                {dots.slice(0, MAX_DOTS).map((dotClass, i) => (
                                    <span key={i} className={"h-1.5 w-1.5 rounded-full " + dotClass} />
                                ))}
                            </div>

                            {/* Tablette et ordinateur : des pastilles */}
                            <div className="hidden space-y-0.5 sm:block">
                                {dispo.length > 0 && (
                                    <p
                                        className={
                                            "truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums " +
                                            TONES.availability.block +
                                            (inMonth ? "" : " opacity-60")
                                        }
                                        title={"Disponible " + dispoText}
                                    >
                                        {dispoText}
                                    </p>
                                )}

                                {absents.map((segment) => (
                                    <button
                                        type="button"
                                        key={"u" + segment.data.id}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onAbsenceClick(segment.data);
                                        }}
                                        className={
                                            "flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[10.5px] font-medium transition-all hover:shadow-sm hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#BE123C]/50 focus-visible:outline-none " +
                                            TONES.absence.block
                                        }
                                    >
                                        <StatusIcon status="absence" className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">
                                            Absent{segment.data.reason !== null ? " · " + segment.data.reason : ""}
                                        </span>
                                    </button>
                                ))}

                                {rdvs.slice(0, MAX_APPOINTMENTS_SHOWN).map((segment) => {
                                    const tone = toneOf(segment.data.status);
                                    return (
                                        <button
                                            type="button"
                                            key={"r" + segment.data.id + "-" + segment.start}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onAppointmentClick(segment.data);
                                            }}
                                            className={
                                                "flex w-full items-center gap-1 rounded-md border-l-2 px-1.5 py-0.5 text-left text-[10.5px] font-medium transition-all hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none " +
                                                tone.block +
                                                " " +
                                                tone.bar
                                            }
                                        >
                                            <span className="tabular-nums opacity-75">{minutesToClock(segment.start)}</span>
                                            <span
                                                className={
                                                    "truncate font-semibold" +
                                                    (isMutedStatus(segment.data.status) ? " line-through" : "")
                                                }
                                            >
                                                {clientName(segment.data)}
                                            </span>
                                        </button>
                                    );
                                })}
                                {rdvs.length > MAX_APPOINTMENTS_SHOWN && (
                                    <p className="px-1.5 text-[10.5px] font-medium text-muted">
                                        + {rdvs.length - MAX_APPOINTMENTS_SHOWN} autre(s)
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
