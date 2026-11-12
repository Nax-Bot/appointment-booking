"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import { getHomePath } from "@/lib/navigation";
import { NavLink } from "@/components/layout/Navbar";
import ClientTopbar from "@/components/layout/ClientTopbar";
import AppShellSkeleton from "@/components/layout/AppShellSkeleton";
import PageTransition from "@/components/layout/PageTransition";

// Les liens de la barre de navigation du client.
// Quand on construira une nouvelle page client, on ajoutera une ligne ici.
const clientLinks: NavLink[] = [
    { href: "/services", label: "Accueil" },
    { href: "/appointments", label: "Mes rendez-vous" },
];

// Enveloppe de toutes les pages de l'espace client
export default function ClientLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (loading === true) {
            return;
        }

        if (user === null) {
            // Personne n'est connecté
            router.replace("/login");
        } else if (user.role !== "CLIENT") {
            // Un professionnel s'est trompé d'espace : on l'envoie dans le sien
            router.replace(getHomePath(user.role));
        }
    }, [loading, user, router]);

    // Tant qu'on n'est pas sûr du rôle, on n'affiche pas la page
    if (loading === true || user === null || user.role !== "CLIENT") {
        return <AppShellSkeleton role="CLIENT" />;
    }

    return (
        // La barre de navigation du client est un bandeau en haut de la page
        <div data-role="CLIENT" className="flex min-h-screen flex-col">
            <ClientTopbar links={clientLinks} />
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12">
                <PageTransition>{children}</PageTransition>
            </main>
        </div>
    );
}
