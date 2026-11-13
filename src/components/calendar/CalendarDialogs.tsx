"use client";

import { CalendarOff, CalendarPlus, CalendarClock, Pencil, Phone, Trash2, Banknote, Clock } from "lucide-react";
import { Unavailability } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import { AvailabilityGroup, describeGroup } from "@/lib/lib-front/availability-groups";
import { formatPrice } from "@/lib/lib-front/format";
import { getStatusLabel } from "@/lib/lib-front/booking-format";
import { TONES, toneOf } from "@/lib/lib-front/calendar-theme";
import StatusIcon from "@/components/calendar/StatusIcon";
import { describeAbsence, formatLongDate, toLocalParts } from "@/lib/lib-front/unavailability-format";
import { clientName, clientPhone, getShortLongDate, minutesToClock } from "@/lib/lib-front/calendar-utils";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Fenêtre ouverte en cliquant sur un créneau vide : que veut-on ajouter ?
// ---------------------------------------------------------------------------
interface SlotDialogProps {
    date: string;
    minutes: number;
    // Les plages horaires déjà prévues ce jour-là (une entrée par carte de la page « Mes horaires »)
    dayGroups: AvailabilityGroup[];
    onAddAppointment: () => void;
    onAddAvailability: () => void;
    onAddAbsence: () => void;
    onEditGroup: (group: AvailabilityGroup) => void;
    onRemoveGroup: (group: AvailabilityGroup) => void;
    onClose: () => void;
}

export function SlotDialog({
    date,
    minutes,
    dayGroups,
    onAddAppointment,
    onAddAvailability,
    onAddAbsence,
    onEditGroup,
    onRemoveGroup,
    onClose,
}: SlotDialogProps) {
    return (
        <Modal open={true} title={getShortLongDate(date) + " · " + minutesToClock(minutes)} onClose={onClose}>
            <p className="mb-3 text-sm text-muted">Que voulez-vous ajouter à cet endroit ?</p>

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onAddAppointment}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-tint/40 hover:shadow-[0_6px_16px_rgba(17,24,39,0.10)] sm:col-span-2"
                >
                    <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + TONES.CONFIRMED.block}>
                        <CalendarClock className="h-5 w-5" />
                    </span>
                    <span>
                        <span className="block font-semibold text-ink">Un rendez-vous</span>
                        <span className="mt-0.5 block text-xs text-muted">
                            Pour un client sans compte (téléphone, sur place…).
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={onAddAvailability}
                    className="group rounded-xl border border-line bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-tint/40 hover:shadow-[0_6px_16px_rgba(17,24,39,0.10)]"
                >
                    <span className={"mb-2 flex h-9 w-9 items-center justify-center rounded-lg " + TONES.availability.block}>
                        <CalendarPlus className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-ink">Une disponibilité</p>
                    <p className="mt-0.5 text-xs text-muted">Une plage horaire où l&apos;on peut réserver chez vous.</p>
                </button>

                <button
                    type="button"
                    onClick={onAddAbsence}
                    className="group rounded-xl border border-line bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#BE123C]/50 hover:bg-[#FFE1E6]/40 hover:shadow-[0_6px_16px_rgba(17,24,39,0.10)]"
                >
                    <span className={"mb-2 flex h-9 w-9 items-center justify-center rounded-lg " + TONES.absence.block}>
                        <CalendarOff className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-ink">Une absence</p>
                    <p className="mt-0.5 text-xs text-muted">Congé, formation : plus aucun créneau proposé.</p>
                </button>
            </div>

            {dayGroups.length > 0 && (
                <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                        Horaires prévus ce jour-là
                    </p>
                    <ul className="space-y-2">
                        {dayGroups.map((group) => (
                            <li
                                key={group.key}
                                className={"flex items-center justify-between gap-2 rounded-lg px-3 py-2 " + TONES.availability.block}
                            >
                                <span className="min-w-0 truncate text-sm font-medium tabular-nums">
                                    {describeGroup(group)}
                                </span>
                                <span className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onEditGroup(group)}
                                        aria-label={"Modifier la plage " + describeGroup(group)}
                                        className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-ink"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveGroup(group)}
                                        aria-label={"Supprimer la plage " + describeGroup(group)}
                                        className="rounded-lg p-1.5 text-muted hover:bg-[#FFE1E6] hover:text-[#BE123C]"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// Détail d'un rendez-vous
// ---------------------------------------------------------------------------
interface AppointmentDialogProps {
    item: AppointmentDetail;
    canCancel: boolean;
    onCancel: () => void;
    onClose: () => void;
}

export function AppointmentDialog({ item, canCancel, onCancel, onClose }: AppointmentDialogProps) {
    const start = toLocalParts(item.startDatetime);
    const end = toLocalParts(item.endDatetime);

    return (
        <Modal open={true} title="Rendez-vous" onClose={onClose}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-2xl font-bold text-ink">
                        {start.timeText} – {end.timeText}
                    </p>
                    <p className="text-sm text-muted">{formatLongDate(start.dateText)}</p>
                </div>
                <span
                    className={
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                        toneOf(item.status).block
                    }
                >
                    <StatusIcon status={item.status} className="h-3.5 w-3.5" />
                    {getStatusLabel(item.status)}
                </span>
            </div>

            <p className="text-lg font-semibold text-ink">{item.service.name}</p>

            <div className="mt-2 text-sm text-ink">
                <p className="flex flex-wrap items-center gap-2">
                    <span>Client : {clientName(item)}</span>
                    {item.guest !== null && (
                        <span className="rounded-full bg-page px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset">
                            Sans compte
                        </span>
                    )}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-muted">
                    <Phone className="h-4 w-4" />
                    {clientPhone(item) !== null ? clientPhone(item) : "Téléphone non renseigné"}
                </p>
            </div>

            {item.priceAtBooking !== null && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Banknote className="h-4 w-4" />
                    {formatPrice(item.priceAtBooking)}
                </p>
            )}

            {item.notes !== null && (
                <p className="mt-2 text-sm break-words whitespace-pre-line text-muted">Notes : {item.notes}</p>
            )}

            {item.cancelledAt !== null && (
                <div className={"mt-3 rounded-lg p-3 text-sm " + TONES.CANCELLED.block}>
                    <p>Rendez-vous annulé</p>
                    {item.cancellationReason !== null && (
                        <p className="mt-0.5 break-words text-muted">Motif : {item.cancellationReason}</p>
                    )}
                </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
                <Button variant="secondary" fullWidth={false} onClick={onClose}>
                    Fermer
                </Button>
                {canCancel && (
                    <Button variant="danger" fullWidth={false} onClick={onCancel}>
                        Annuler le rendez-vous
                    </Button>
                )}
            </div>
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// Détail d'une absence : modifier ou supprimer
// ---------------------------------------------------------------------------
interface AbsenceDialogProps {
    item: Unavailability;
    onEdit: () => void;
    onRemove: () => void;
    onClose: () => void;
}

export function AbsenceDialog({ item, onEdit, onRemove, onClose }: AbsenceDialogProps) {
    const description = describeAbsence(item);

    return (
        <Modal open={true} title="Absence" onClose={onClose}>
            <p className="text-lg font-bold text-ink">{description.title}</p>
            {description.subtitle !== "" && <p className="text-sm text-muted">{description.subtitle}</p>}
            <span
                className={
                    "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " + TONES.absence.block
                }
            >
                <Clock className="h-3.5 w-3.5" />
                {description.badge}
            </span>
            {item.reason !== null && <p className="mt-2 text-sm break-words text-muted">Motif : {item.reason}</p>}

            <div className="mt-5 flex justify-end gap-3">
                <Button variant="secondary" fullWidth={false} onClick={onRemove}>
                    <span className="flex items-center gap-1.5 text-[#BE123C]">
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                    </span>
                </Button>
                <Button fullWidth={false} onClick={onEdit}>
                    <span className="flex items-center gap-1.5">
                        <Pencil className="h-4 w-4" />
                        Modifier
                    </span>
                </Button>
            </div>
        </Modal>
    );
}
