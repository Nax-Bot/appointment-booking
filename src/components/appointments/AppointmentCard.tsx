import Link from "next/link";
import { Banknote, CalendarPlus, ChevronRight, Clock, Phone } from "lucide-react";
import { Role } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import { formatPrice } from "@/lib/lib-front/format";
import { formatLongDate, toLocalParts } from "@/lib/lib-front/unavailability-format";
import { getStatusLabel, getStatusStyle } from "@/lib/lib-front/booking-format";
import { getInitials } from "@/lib/lib-front/text-helpers";
import { clientName, clientPhone } from "@/lib/lib-front/calendar-utils";

// Une carte de rendez-vous.
// role = le rôle de la personne connectée : il décide de qui on montre (le professionnel ou le client).
// muted = le rendez-vous est passé ou annulé : on l'affiche en plus pâle.
// canCancel = faut-il afficher le bouton « Annuler » ?
interface AppointmentCardProps {
    item: AppointmentDetail;
    role: Role;
    muted: boolean;
    canCancel: boolean;
    onCancel: (item: AppointmentDetail) => void;
}

export default function AppointmentCard({
    item,
    role,
    muted,
    canCancel,
    onCancel,
}: AppointmentCardProps) {
    // Les dates reçues sont en UTC : on les convertit en heure de Madagascar
    const start = toLocalParts(item.startDatetime);
    const end = toLocalParts(item.endDatetime);

    let cardClass = "";
    if (muted) {
        cardClass = "opacity-70";
    }

    // La date d'annulation (seulement pour un rendez-vous annulé)
    let cancelledText = "";
    if (item.cancelledAt !== null) {
        const cancelled = toLocalParts(item.cancelledAt);
        cancelledText =
            "Annulé le " + formatLongDate(cancelled.dateText, false) + " à " + cancelled.timeText;
    }

    // Le client a sa propre présentation : bloc date, bandeau de couleur, bouton « Reprendre rendez-vous »
    if (role === "CLIENT") {
        return (
            <ClientAppointmentCard
                item={item}
                muted={muted}
                canCancel={canCancel}
                onCancel={onCancel}
                timeText={start.timeText + " – " + end.timeText}
                dateText={start.dateText}
                cancelledText={cancelledText}
            />
        );
    }

    return (
        <li
            className={
                "rounded-2xl border border-line bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md " + cardClass
            }
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-2xl font-bold text-ink">
                        {start.timeText} – {end.timeText}
                    </p>
                    <p className="text-sm text-muted">{formatLongDate(start.dateText)}</p>
                </div>
                <span
                    className={
                        "rounded-full px-2.5 py-1 text-sm font-medium " + getStatusStyle(item.status)
                    }
                >
                    {getStatusLabel(item.status)}
                </span>
            </div>

            <p className="mt-3 text-lg font-semibold text-ink">{item.service.name}</p>

            {/* Le professionnel voit son client (le client a sa propre carte, plus haut) */}
            <div className="text-sm text-ink">
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
                <p className="mt-2 text-sm break-words whitespace-pre-line text-muted">
                    Notes : {item.notes}
                </p>
            )}

            {cancelledText !== "" && (
                <div className="mt-3 rounded-lg bg-gray-100 p-3 text-sm text-ink">
                    <p>{cancelledText}</p>
                    {item.cancellationReason !== null && (
                        <p className="mt-0.5 break-words text-muted">
                            Motif : {item.cancellationReason}
                        </p>
                    )}
                </div>
            )}

            {canCancel && (
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={() => onCancel(item)}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                        Annuler
                    </button>
                </div>
            )}
        </li>
    );
}

interface ClientAppointmentCardProps {
    item: AppointmentDetail;
    muted: boolean;
    canCancel: boolean;
    onCancel: (item: AppointmentDetail) => void;
    timeText: string;
    dateText: string; // « 2026-11-16 »
    cancelledText: string;
}

// La carte de rendez-vous du CLIENT : compacte, trois zones.
// 1. le bloc date  2. les infos principales (service, heure, professionnel)  3. le prix et les actions
function ClientAppointmentCard({
    item,
    muted,
    canCancel,
    onCancel,
    timeText,
    dateText,
    cancelledText,
}: ClientAppointmentCardProps) {
    const date = new Date(dateText + "T00:00:00.000Z");
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    const month = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
        .format(date)
        .replace(".", "");
    const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" })
        .format(date)
        .replace(".", "");

    // On propose de reprendre rendez-vous quand celui-ci n'est plus à venir (passé ou annulé)
    const canRebook = canCancel === false;
    const rebookHref = "/professionals/" + item.professional.userId + "?serviceId=" + item.service.id;

    const hasFooter = item.priceAtBooking !== null || canCancel || canRebook;

    return (
        <li
            className={
                "group flex flex-col rounded-xl border border-line bg-white transition-colors duration-200 hover:border-primary/40 " +
                (muted ? "bg-white/70" : "")
            }
        >
            <div className="flex flex-1 gap-3.5 p-4">
                {/* Bloc date : mois, jour, année */}
                <div
                    className={
                        "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-tint/60 leading-none transition-colors duration-200 group-hover:border-primary/30 " +
                        (muted ? "text-muted" : "text-primary")
                    }
                >
                    <span className="text-[11px] font-semibold tracking-wide uppercase">{month}</span>
                    <span className="my-0.5 text-2xl font-bold">{day}</span>
                    <span className="text-[10px] font-medium opacity-70">{year}</span>
                </div>

                <div className="min-w-0 flex-1">
                    {/* Service en évidence + badge de statut */}
                    <div className="flex items-start justify-between gap-2">
                        <p className={"truncate text-base font-semibold " + (muted ? "text-ink/80" : "text-ink")}>
                            {item.service.name}
                        </p>
                        <span
                            className={
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                                getStatusStyle(item.status)
                            }
                        >
                            {getStatusLabel(item.status)}
                        </span>
                    </div>

                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/80">
                        <Clock className="h-3.5 w-3.5 text-muted" />
                        <span className="capitalize">{weekday}</span>
                        <span className="text-muted">·</span>
                        {timeText}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-[10px] font-bold text-primary">
                            {getInitials(item.professional.firstName, item.professional.lastName)}
                        </span>
                        <p className="min-w-0 truncate text-sm text-ink">
                            {item.professional.firstName} {item.professional.lastName}
                            {item.professional.specialty !== null && (
                                <span className="text-muted"> · {item.professional.specialty}</span>
                            )}
                        </p>
                    </div>

                    {item.notes !== null && (
                        <p className="mt-2 line-clamp-1 text-xs break-words text-muted" title={item.notes}>
                            Notes : {item.notes}
                        </p>
                    )}

                    {cancelledText !== "" && (
                        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-ink">
                            <p>{cancelledText}</p>
                            {item.cancellationReason !== null && (
                                <p className="mt-0.5 break-words text-muted">
                                    Motif : {item.cancellationReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Pied de carte : le prix à gauche, les actions à droite */}
            {hasFooter && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
                    {item.priceAtBooking !== null ? (
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                            <Banknote className="h-4 w-4 text-primary" />
                            {formatPrice(item.priceAtBooking)}
                        </p>
                    ) : (
                        <span />
                    )}

                    <div className="flex items-center gap-1.5">
                        {canCancel && (
                            <button
                                type="button"
                                onClick={() => onCancel(item)}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600/90 transition-colors hover:bg-red-50 active:scale-95"
                            >
                                Annuler
                            </button>
                        )}
                        {canRebook && (
                            <Link
                                href={rebookHref}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover active:scale-95"
                            >
                                <CalendarPlus className="h-4 w-4" />
                                Reprendre rendez-vous
                                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}
