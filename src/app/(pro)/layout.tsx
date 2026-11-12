"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import { getHomePath } from "@/lib/navigation";
import Navbar, { NavLink } from "@/components/layout/Navbar";
import AppShellSkeleton from "@/components/layout/AppShellSkeleton";
import PageTransition from "@/components/layout/PageTransition";

// Les liens de la barre de navigation du professionnel.
// Quand on construira une nouvelle page professionnel, on ajoutera une ligne ici.
const proLinks: NavLink[] = [
    { href: "/pro/profile", label: "Mon profil" },
    { href: "/pro/calendar", label: "Mon calendrier" },
    { href: "/pro/services", label: "Mes services" },
    { href: "/pro/availabilities", label: "Mes horaires" },
    { href: "/pro/unavailabilities", label: "Mes absences" },
    { href: "/pro/appointments", label: "Mes rendez-vous" },
];

// Enveloppe de toutes les pages de l'espace professionnel
export default function ProLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useSession();
    const router = useRouter();

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
            <Navbar links={proLinks} />
        </div>
    );
}