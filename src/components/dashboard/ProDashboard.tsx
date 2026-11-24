"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    Banknote,
    CalendarCheck,
    CalendarDays,
    Check,
    Clock,
    Hourglass,
    Phone,
    Sparkles,
} from "lucide-react";
import { useSession } from "@/context/session-context";
import { apiGet, ApiError } from "@/lib/client/api-client";
import { AppointmentDetail } from "@/types/booking";
import { computeDashboardStats, DashboardStats } from "@/lib/client/data/dashboard-stats";
import { clientName, clientPhone } from "@/lib/client/calendar/calendar-utils";
import { getStatusLabel, getStatusStyle, getTodayLocalDate } from "@/lib/client/format/booking-format";
import { formatPrice } from "@/lib/client/format/format";
import { getInitials } from "@/lib/client/format/text-helpers";
import { formatLongDate, toLocalParts } from "@/lib/client/format/unavailability-format";
import { TONES } from "@/lib/client/calendar/calendar-theme";
import PageLoading from "@/components/ui/PageLoading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PageHeader from "@/components/ui/PageHeader";
import PaymentSetupBanner from "@/components/payments/PaymentSetupBanner";

// Combien de demandes on montre sur le tableau de bord (les autres sont dans « Rendez-vous »)
const MAX_PENDING_SHOWN = 5;

// Les statuts du bloc « Ce mois-ci », dans l'ordre d'affichage
const MONTH_STATUS_ORDER = ["CONFIRMED", "COMPLETED", "PENDING", "CANCELLED", "NO_SHOW"] as const;

export default function ProDashboard() {
    const { user } = useSession();
    const [items, setItems] = useState<AppointmentDetail[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    // L'instant où la page s'ouvre : il se met à jour à chaque rechargement des données
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await apiGet<AppointmentDetail[]>("/api/appointments");
                if (cancelled === false) {
                    setItems(result);
                    setNow(Date.now());
                    setLoadError("");
                }
            } catch (error) {
                if (cancelled === false) {
                    setLoadError(error instanceof ApiError ? error.message : "Impossible de charger vos rendez-vous");
                }
            }
            if (cancelled === false) {
                setLoaded(true);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [reloadCount]);

    if (loaded === false) {
        return <PageLoading kind="people" label="Préparation de votre tableau de bord..." />;
    }

    const today = getTodayLocalDate();
    const stats = computeDashboardStats(items, today, now);
    const firstName = user !== null ? user.firstName : "";

    return (
        <div>
            <PageHeader
                eyebrow={formatLongDate(today)}
                title={"Bonjour" + (firstName !== "" ? ", " + firstName : "")}
                actions={
                    <Link
                        href="/pro/calendar"
                        className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-tint"
                    >
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Ouvrir le calendrier
                    </Link>
                }
            />

            <PaymentSetupBanner />
            <ErrorMessage message={loadError} details={[]} />

            {/* Les chiffres clés */}
            <section className="stagger mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    icon={<CalendarCheck className="h-5 w-5" />}
                    label="Aujourd'hui"
                    value={String(stats.today.length)}
                    hint={
                        stats.today.length === 0
                            ? "Aucun rendez-vous"
                            : stats.todayRemaining === 0
                              ? "Tous terminés"
                              : stats.todayRemaining + (stats.todayRemaining > 1 ? " restants" : " restant")
                    }
                />
                <StatCard
                    icon={<Hourglass className="h-5 w-5" />}
                    label="En attente"
                    value={String(stats.pending.length)}
                    hint={stats.pending.length === 0 ? "Aucun paiement attendu" : "Paiements attendus"}
                    accent={stats.pending.length > 0 ? "amber" : "default"}
                />
                <StatCard
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Cette semaine"
                    value={String(stats.weekCount)}
                    hint="rendez-vous"
                />
                <StatCard
                    icon={<Banknote className="h-5 w-5" />}
                    label="Revenus du mois"
                    value={formatPrice(stats.monthRevenue)}
                    hint="Confirmés et terminés"
                    small
                />
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                {/* ---------- Colonne principale ---------- */}
                <div className="space-y-6">
                    <PendingPanel pending={stats.pending} />
                    <TodayPanel stats={stats} now={now} />
                </div>

                {/* ---------- Colonne latérale ---------- */}
                <div className="space-y-6">
                    <NextCard item={stats.next} today={today} />
                    <WeekChart stats={stats} />
                    <MonthBreakdown stats={stats} />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- Chiffre clé

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint: string;
    accent?: "default" | "amber";
    small?: boolean; // un nombre long (le prix) : texte un peu plus petit
}

function StatCard({ icon, label, value, hint, accent = "default", small = false }: StatCardProps) {
    const iconClass = accent === "amber" ? "bg-amber-100 text-amber-700" : "bg-tint text-primary";
    return (
        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted">{label}</p>
                <span className={"flex h-9 w-9 items-center justify-center rounded-xl " + iconClass}>{icon}</span>
            </div>
            <p
                className={
                    "mt-3 font-bold tracking-tight text-ink tabular-nums " +
                    (small ? "text-xl sm:text-2xl" : "text-3xl")
                }
            >
                {value}
            </p>
            <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
    );
}

// ---------------------------------------------------------------- Un bloc avec titre

function Panel({
    title,
    subtitle,
    action,
    children,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-line bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink">{title}</h2>
                    {subtitle !== undefined && <p className="text-xs text-muted">{subtitle}</p>}
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-muted">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-primary">{icon}</span>
            {text}
        </div>
    );
}

// ---------------------------------------------------------------- Demandes à confirmer

function PendingPanel({ pending }: { pending: AppointmentDetail[] }) {
    const shown = pending.slice(0, MAX_PENDING_SHOWN);

    return (
        <Panel
            title="En attente de paiement"
            subtitle={pending.length > 0 ? "Confirmés automatiquement au paiement" : undefined}
            action={
                pending.length > 0 ? (
                    <Link
                        href="/pro/appointments"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                        {pending.length > MAX_PENDING_SHOWN ? "Voir les " + pending.length : "Voir tout"}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                ) : undefined
            }
        >
            {pending.length === 0 ? (
                <EmptyLine icon={<Check className="h-5 w-5" strokeWidth={3} />} text="Aucun paiement en attente." />
            ) : (
                <ul className="divide-y divide-line">
                    {shown.map((item) => {
                        const start = toLocalParts(item.startDatetime);
                        const end = toLocalParts(item.endDatetime);
                        return (
                            <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                                    {initialsOf(item)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{clientName(item)}</p>
                                    <p className="truncate text-sm text-muted">
                                        {item.service.name}
                                        {item.priceAtBooking !== null && " · " + formatPrice(item.priceAtBooking)}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-medium text-ink">{shortDate(start.dateText)}</p>
                                    <p className="text-xs text-muted tabular-nums">
                                        {start.timeText} – {end.timeText}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

// ---------------------------------------------------------------- Aujourd'hui

function TodayPanel({ stats, now }: { stats: DashboardStats; now: number }) {
    return (
        <Panel
            title="Aujourd'hui"
            subtitle={stats.today.length > 0 ? stats.today.length + " rendez-vous" : undefined}
            action={
                <Link
                    href="/pro/appointments"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    Tous les rendez-vous
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            }
        >
            {stats.today.length === 0 ? (
                <EmptyLine icon={<Sparkles className="h-5 w-5" />} text="Aucun rendez-vous aujourd'hui." />
            ) : (
                <ul className="divide-y divide-line">
                    {stats.today.map((item) => {
                        const start = toLocalParts(item.startDatetime);
                        const end = toLocalParts(item.endDatetime);
                        const isNext = stats.next !== null && stats.next.id === item.id;
                        const finished = new Date(item.endDatetime).getTime() <= now;
                        return (
                            <li
                                key={item.id}
                                className={"flex items-center gap-4 px-5 py-3.5 " + (finished ? "opacity-60" : "")}
                            >
                                <div className="w-24 shrink-0">
                                    <p className="text-sm font-semibold text-ink tabular-nums">{start.timeText}</p>
                                    <p className="text-xs text-muted tabular-nums">{end.timeText}</p>
                                </div>
                                <span className={"h-10 w-1 shrink-0 rounded-full " + toneDot(item.status)} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{item.service.name}</p>
                                    <p className="truncate text-sm text-muted">{clientName(item)}</p>
                                </div>
                                {isNext && (
                                    <span className="hidden rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white sm:inline">
                                        Prochain
                                    </span>
                                )}
                                <span
                                    className={
                                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " + getStatusStyle(item.status)
                                    }
                                >
                                    {getStatusLabel(item.status)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

// ---------------------------------------------------------------- Prochain rendez-vous

function NextCard({ item, today }: { item: AppointmentDetail | null; today: string }) {
    if (item === null) {
        return (
            <Panel title="Prochain rendez-vous">
                <EmptyLine icon={<CalendarDays className="h-5 w-5" />} text="Aucun rendez-vous à venir pour le moment." />
            </Panel>
        );
    }

    const start = toLocalParts(item.startDatetime);
    const end = toLocalParts(item.endDatetime);
    const phone = clientPhone(item);
    const when = start.dateText === today ? "Aujourd'hui" : shortDate(start.dateText);

    return (
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-tint via-white to-white p-5">
            <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
            <p className="relative text-xs font-semibold tracking-wider text-primary uppercase">Prochain rendez-vous</p>
            <p className="relative mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">
                {start.timeText} <span className="text-base font-medium text-muted">– {end.timeText}</span>
            </p>
            <p className="relative text-sm font-medium text-ink/80">{when}</p>

            <div className="relative mt-4 flex items-center gap-3 border-t border-line pt-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {initialsOf(item)}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{clientName(item)}</p>
                    <p className="truncate text-sm text-muted">{item.service.name}</p>
                </div>
            </div>
            {phone !== null && (
                <p className="relative mt-3 flex items-center gap-1.5 text-sm text-ink/80">
                    <Phone className="h-4 w-4 text-muted" />
                    {phone}
                </p>
            )}
        </section>
    );
}

// ---------------------------------------------------------------- 7 prochains jours

function WeekChart({ stats }: { stats: DashboardStats }) {
    const max = Math.max(1, ...stats.next7Days.map((day) => day.count));
    const total = stats.next7Days.reduce((sum, day) => sum + day.count, 0);

    return (
        <Panel title="7 prochains jours" subtitle={total + (total > 1 ? " rendez-vous prévus" : " rendez-vous prévu")}>
            <div className="px-5 pt-5 pb-4">
                <div className="flex h-32 items-end gap-2">
                    {stats.next7Days.map((day) => {
                        const height = day.count === 0 ? 4 : Math.max(14, Math.round((day.count / max) * 100));
                        return (
                            <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                                <span className={"text-xs font-semibold tabular-nums " + (day.count > 0 ? "text-ink" : "text-transparent")}>
                                    {day.count}
                                </span>
                                <div
                                    className={
                                        "w-full max-w-9 rounded-md transition-all duration-500 " +
                                        (day.count === 0 ? "bg-line" : day.isToday ? "bg-primary" : "bg-primary/35")
                                    }
                                    style={{ height: height + "%" }}
                                    title={day.count + " rendez-vous"}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-2 flex gap-2">
                    {stats.next7Days.map((day) => (
                        <div key={day.date} className="flex-1 text-center leading-tight">
                            <p className={"text-[11px] capitalize " + (day.isToday ? "font-semibold text-primary" : "text-muted")}>
                                {day.weekday}
                            </p>
                            <p className={"text-xs tabular-nums " + (day.isToday ? "font-bold text-primary" : "text-ink/70")}>
                                {day.dayNumber}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </Panel>
    );
}

// ---------------------------------------------------------------- Ce mois-ci

function MonthBreakdown({ stats }: { stats: DashboardStats }) {
    const total = MONTH_STATUS_ORDER.reduce((sum, key) => sum + stats.monthStatus[key], 0);

    return (
        <Panel title="Ce mois-ci" subtitle={total > 0 ? total + " rendez-vous" : undefined}>
            {total === 0 ? (
                <EmptyLine icon={<CalendarDays className="h-5 w-5" />} text="Pas encore de rendez-vous ce mois-ci." />
            ) : (
                <div className="px-5 py-4">
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
                        {MONTH_STATUS_ORDER.map((key) => {
                            const count = stats.monthStatus[key];
                            if (count === 0) {
                                return null;
                            }
                            return (
                                <div
                                    key={key}
                                    className={TONES[key].dot}
                                    style={{ width: (count / total) * 100 + "%" }}
                                    title={TONES[key].label + " : " + count}
                                />
                            );
                        })}
                    </div>
                    <ul className="mt-4 space-y-2">
                        {MONTH_STATUS_ORDER.map((key) => (
                            <li key={key} className="flex items-center gap-2.5 text-sm">
                                <span className={"h-2.5 w-2.5 rounded-full " + TONES[key].dot} />
                                <span className="flex-1 text-ink/80">{TONES[key].label}</span>
                                <span className="font-semibold text-ink tabular-nums">{stats.monthStatus[key]}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}

// ---------------------------------------------------------------- Petits utilitaires

function initialsOf(item: AppointmentDetail): string {
    if (item.client !== null) {
        return getInitials(item.client.firstName, item.client.lastName);
    }
    const parts = clientName(item).trim().split(/\s+/);
    return getInitials(parts[0] ?? "", parts.length > 1 ? parts[parts.length - 1] : "");
}

// « 2026-11-18 » devient « mer. 18 nov. »
function shortDate(dateText: string): string {
    return new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    }).format(new Date(dateText + "T00:00:00.000Z"));
}

// La couleur de la barre d'un rendez-vous, comme dans le calendrier
function toneDot(status: string): string {
    if (status === "CONFIRMED" || status === "PENDING" || status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW") {
        return TONES[status].dot;
    }
    return "bg-line";
}
