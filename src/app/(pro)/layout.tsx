"use client";

import { useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, CalendarDays, CalendarOff, ClipboardList, Clock, LayoutDashboard, UserRound } from "lucide-react";
import { useSession } from "@/context/session-context";
import { getHomePath } from "@/lib/navigation";
import Navbar, { NavGroup } from "@/components/layout/Navbar";
import { apiGet } from "@/lib/lib-front/api-client";
import { AppointmentDetail } from "@/types/booking";
import AppShellSkeleton from "@/components/layout/AppShellSkeleton";
import PageTransition from "@/components/layout/PageTransition";

// Les sections de la barre de navigation du professionnel.
// Quand on construira une nouvelle page professionnel, on ajoutera une ligne dans la bonne section.
function buildProGroups(pendingCount: number): NavGroup[] {
    return [
        {
            title: "Pilotage",
            links: [
                { href: "/pro/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
                { href: "/pro/calendar", label: "Calendrier", icon: CalendarDays },
                { href: "/pro/appointments", label: "Rendez-vous", icon: ClipboardList, badge: pendingCount },
            ],
        },
        {
            title: "Offre & disponibilités",
            links: [
                { href: "/pro/services", label: "Services", icon: Briefcase },
                { href: "/pro/availabilities", label: "Horaires", icon: Clock },
                { href: "/pro/unavailabilities", label: "Absences", icon: CalendarOff },
            ],
        },
        {
            title: "Compte",
            links: [{ href: "/pro/profile", label: "Mon profil", icon: UserRound }],
        },
    ];
}

// Enveloppe de toutes les pages de l'espace professionnel
export default function ProLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    // Le nombre de demandes à confirmer : la pastille de « Rendez-vous »
    const [pendingCount, setPendingCount] = useState(0);
    const isPro = user !== null && user.role === "PROFESSIONAL";

    // On le recompte à chaque changement de page
    useEffect(() => {
        if (isPro === false) {
            return;
        }
        let cancelled = false;

        async function loadPending() {
            try {
                const pending = await apiGet<AppointmentDetail[]>("/api/appointments?status=PENDING");
                if (cancelled === false) {
                    const now = Date.now();
                    setPendingCount(pending.filter((item) => new Date(item.startDatetime).getTime() > now).length);
                }
            } catch {
                // La pastille est un confort : sans elle, la page fonctionne quand même
            }
        }

        loadPending();
        return () => {
            cancelled = true;
        };
    }, [isPro, pathname]);

    useEffect(() => {
        if (loading === true) {
            return;
        }

        if (user === null) {
            // Personne n'est connecté
            router.replace("/login");
        } else if (user.role !== "PROFESSIONAL") {
            // Un client s'est trompé d'espace : on l'envoie dans le sien
            router.replace(getHomePath(user.role));
        }
    }, [loading, user, router]);

    // Tant qu'on n'est pas sûr du rôle, on n'affiche pas la page
    if (loading === true || user === null || user.role !== "PROFESSIONAL") {
        return <AppShellSkeleton role="PROFESSIONAL" />;
    }

    return (
        // La barre de navigation est une colonne à gauche (en haut sur petit écran)
        <div data-role="PROFESSIONAL" className="flex min-h-screen flex-col lg:flex-row">
            <main className="min-w-0 flex-1 p-6">
                <div className="mx-auto max-w-6xl">
                    <PageTransition>{children}</PageTransition>
                </div>
            </main>
            <Navbar groups={buildProGroups(pendingCount)} />
        </div>
    );
}