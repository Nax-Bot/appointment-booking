"use client";

import { CalendarCheck2 } from "lucide-react";
import { Availability, Unavailability } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import { getStatusLabel } from "@/lib/lib-front/booking-format";
import { describeAbsence } from "@/lib/lib-front/unavailability-format";
import {
    absencesOnDate,
    appointmentsOnDate,
    availabilitiesOnDate,
    clientName,
    getShortLongDate,
    minutesToClock,
} from "@/lib/lib-front/calendar-utils";
import { TONES, isMutedStatus, toneOf } from "@/lib/lib-front/calendar-theme";
import StatusIcon from "@/components/calendar/StatusIcon";

// Le panneau « Agenda du jour » à côté de la vue Jour : un résumé et la chronologie cliquable.
interface DayAgendaProps {
    date: string;
    availabilities: Availability[];
    absences: Unavailability[];
    appointments: AppointmentDetail[];
    showCancelled: boolean;
    onAppointmentClick: (item: AppointmentDetail) => void;
    onAbsenceClick: (item: Unavailability) => void;
}

// 150 minutes -> « 2 h 30 »
function formatHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (rest === 0) {
        return hours + " h";
    }
    return hours + " h " + String(rest).padStart(2, "0");
}

type TimelineItem =
    | { kind: "appointment"; start: number; end: number; item: AppointmentDetail }
    | { kind: "absence"; start: number; end: number; item: Unavailability };

export default function DayAgenda({
    date,
    availabilities,
    absences,
    appointments,
    showCancelled,
    onAppointmentClick,
    onAbsenceClick,
}: DayAgendaProps) {
    const dispo = availabilitiesOnDate(availabilities, date);
    const absents = absencesOnDate(absences, date);
    const rdvs = appointmentsOnDate(appointments, date, showCancelled);

    let availableMinutes = 0;
    for (const segment of dispo) {
        availableMinutes = availableMinutes + (segment.end - segment.start);
    }
    const activeCount = rdvs.filter((segment) => isMutedStatus(segment.data.status) === false).length;
    const pendingCount = rdvs.filter((segment) => segment.data.status === "PENDING").length;

    const timeline: TimelineItem[] = [];
    for (const segment of rdvs) {
        timeline.push({ kind: "appointment", start: segment.start, end: segment.end, item: segment.data });
    }
    for (const segment of absents) {
        timeline.push({ kind: "absence", start: segment.start, end: segment.end, item: segment.data });
    }
    timeline.sort((a, b) => a.start - b.start);

    return (
        <aside className="animate-fade-in rounded-xl border border-line bg-white p-4">
            <p className="text-[11px] font-medium tracking-wider text-muted uppercase">Agenda du jour</p>
            <p className="mt-0.5 text-base font-semibold tracking-tight text-ink">{getShortLongDate(date)}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-tint px-3 py-2.5">
                    <p className="text-xl font-semibold text-ink tabular-nums">{activeCount}</p>
                    <p className="text-[11px] text-muted">
                        rendez-vous{pendingCount > 0 ? " · " + pendingCount + " en attente" : ""}
                    </p>
                </div>
                <div className="rounded-lg bg-tint px-3 py-2.5">
                    <p className="text-xl font-semibold text-ink tabular-nums">
                        {availableMinutes > 0 ? formatHours(availableMinutes) : "—"}
                    </p>
                    <p className="text-[11px] text-muted">de disponibilité</p>
                </div>
            </div>

            {dispo.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {dispo.map((segment) => (
                        <span
                            key={segment.data.id}
                            className={"rounded-md px-2 py-1 text-xs font-medium tabular-nums " + TONES.availability.block}
                        >
                            {segment.data.startTime} – {segment.data.endTime}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-5">
                {timeline.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
                        <CalendarCheck2 className="mx-auto mb-2 h-5 w-5 text-muted" />
                        <p className="text-sm font-medium text-ink">Rien de prévu</p>
                        <p className="mt-0.5 text-xs text-muted">Aucun rendez-vous ni absence ce jour-là.</p>
                    </div>
                ) : (
                    <ul className="relative space-y-1.5 before:absolute before:top-2 before:bottom-2 before:left-[3.9rem] before:w-px before:bg-line">
                        {timeline.map((entry, index) => {
                            const status = entry.kind === "appointment" ? entry.item.status : "absence";
                            const tone = entry.kind === "appointment" ? toneOf(entry.item.status) : TONES.absence;
                            const muted = entry.kind === "appointment" && isMutedStatus(entry.item.status);
                            const title =
                                entry.kind === "appointment"
                                    ? clientName(entry.item)
                                    : describeAbsence(entry.item).badge;
                            const subtitle =
                                entry.kind === "appointment"
                                    ? entry.item.service.name
                                    : entry.item.reason !== null
                                      ? entry.item.reason
                                      : "Absence";

                            return (
                                <li key={entry.kind + entry.item.id + "-" + entry.start}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            entry.kind === "appointment"
                                                ? onAppointmentClick(entry.item)
                                                : onAbsenceClick(entry.item)
                                        }
                                        style={{ animationDelay: index * 40 + "ms" }}
                                        className="animate-pop-in group flex w-full items-start gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-tint focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                                    >
                                        <span className="w-12 shrink-0 pt-0.5 text-right text-xs text-muted tabular-nums">
                                            {minutesToClock(entry.start)}
                                        </span>
                                        <span
                                            className={
                                                "relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white transition-all group-hover:ring-tint " +
                                                tone.dot
                                            }
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={
                                                    "block truncate text-sm font-medium text-ink" +
                                                    (muted ? " line-through opacity-70" : "")
                                                }
                                            >
                                                {title}
                                            </span>
                                            <span className="block truncate text-xs text-muted">{subtitle}</span>
                                            <span
                                                className={
                                                    "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium " +
                                                    tone.block
                                                }
                                            >
                                                <StatusIcon status={status} className="h-2.5 w-2.5" />
                                                {entry.kind === "appointment" ? getStatusLabel(entry.item.status) : "Absence"}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </aside>
    );
}
