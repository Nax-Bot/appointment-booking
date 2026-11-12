"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/lib-front/api-client";
import { AppointmentDetail } from "@/types/booking";
import { getInitials } from "@/lib/lib-front/text-helpers";
import { Skeleton } from "@/components/ui/Skeleton";

// Petit bloc « Votre prochain rendez-vous » : le rendez-vous à venir le plus proche
// (en attente ou confirmé). Si la liste ne peut pas être chargée, le bloc disparaît.
export default function NextAppointmentCard() {
    const [next, setNext] = useState<AppointmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const list = await apiGet<AppointmentDetail[]>("/api/appointments");
                const now = Date.now();
                const upcoming = list
                    .filter(
                        (item) =>
                            (item.status === "PENDING" || item.status === "CONFIRMED") &&
                            new Date(item.startDatetime).getTime() > now
                    )
                    .sort(
                        (a, b) =>
                            new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
                    );
                if (cancelled === false) {
                    setNext(upcoming.length > 0 ? upcoming[0] : null);
                }
            } catch (error) {
                console.error(error);
                if (cancelled === false) {
                    setFailed(true);
                }
            }
            if (cancelled === false) {
                setLoading(false);
            }
        }
        load();

        return () => {
            cancelled = true;
        };
    }, []);

    if (failed) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
                <CalendarClock className="h-4 w-4 text-primary" />
                Votre prochain rendez-vous
            </h2>

            {loading && (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            )}

            {loading === false && next === null && (
                <p className="text-sm text-muted">
                    Aucun rendez-vous à venir. Choisissez un professionnel pour réserver un créneau.
                </p>
            )}

            {loading === false && next !== null && (
                <Link href="/appointments" className="group block">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tint to-white text-sm font-bold text-primary ring-1 ring-primary/15">
                            {getInitials(next.professional.firstName, next.professional.lastName)}
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">
                                {next.professional.firstName} {next.professional.lastName}
                            </span>
                            <span className="block truncate text-sm text-muted">{next.service.name}</span>
                        </span>
                    </div>
                    <p className="mt-3 rounded-xl bg-tint px-3 py-2 text-sm font-medium text-primary first-letter:uppercase">
                        {new Date(next.startDatetime).toLocaleString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Indian/Antananarivo",
                        })}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        Voir mes rendez-vous
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </Link>
            )}
        </div>
    );
}
