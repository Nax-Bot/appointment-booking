"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { useSession } from "@/context/session-context";
import { getInitials } from "@/lib/client/format/text-helpers";

// Le nom de chaque page, affiché dans le fil d'Ariane du bandeau
const PAGE_TITLES: { prefix: string; title: string }[] = [
    { prefix: "/pro/dashboard", title: "Tableau de bord" },
    { prefix: "/pro/calendar", title: "Calendrier" },
    { prefix: "/pro/appointments", title: "Rendez-vous" },
    { prefix: "/pro/services", title: "Services" },
    { prefix: "/pro/availabilities", title: "Horaires" },
    { prefix: "/pro/unavailabilities", title: "Absences" },
    { prefix: "/pro/profile", title: "Mon profil" },
];

// Le bandeau du HAUT de l'espace professionnel (grand écran) :
// fil d'Ariane à gauche ; à droite la cloche (rendez-vous à payer) et le profil.
// Sur petit écran, la barre de navigation du haut joue déjà ce rôle : le bandeau est masqué.
export default function ProTopbar({ pendingCount }: { pendingCount: number }) {
    const { user } = useSession();
    const pathname = usePathname();

    const current = PAGE_TITLES.find((page) => pathname === page.prefix || pathname.startsWith(page.prefix + "/"));

    return (
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-line/70 bg-white/75 px-6 backdrop-blur-xl lg:flex">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm">
                <span className="text-muted">Espace professionnel</span>
                {current !== undefined && (
                    <>
                        <ChevronRight className="h-4 w-4 text-muted/60" />
                        <span className="font-semibold text-ink">{current.title}</span>
                    </>
                )}
            </nav>

            <div className="flex items-center gap-3">
                <Link
                    href="/pro/appointments"
                    title={pendingCount > 0 ? pendingCount + " rendez-vous en attente de paiement" : "Rendez-vous"}
                    aria-label="Rendez-vous en attente"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink/75 transition-all hover:bg-tint hover:text-ink active:scale-95"
                >
                    <Bell className="h-[18px] w-[18px]" />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                            {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                    )}
                </Link>

                {user !== null && (
                    <Link
                        href="/pro/profile"
                        title="Mon profil"
                        className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pr-4 pl-1 shadow-sm transition-colors hover:bg-tint"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-xs font-bold text-white">
                            {getInitials(user.firstName, user.lastName)}
                        </span>
                        <span className="leading-tight">
                            <span className="block max-w-36 truncate text-sm font-medium text-ink">
                                {user.firstName} {user.lastName}
                            </span>
                            <span className="block text-[11px] text-muted">Professionnel</span>
                        </span>
                    </Link>
                )}
            </div>
        </header>
    );
}
