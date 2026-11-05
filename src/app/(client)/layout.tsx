"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import { getHomePath } from "@/lib/navigation";
import Navbar, { NavLink } from "@/components/layout/Navbar";

// Les liens de la barre de navigation du client.
// Quand on construira une nouvelle page client, on ajoutera une ligne ici.
const clientLinks: NavLink[] = [
    { href: "/services", label: "Rechercher un service" },
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
        return <p className="p-8">Chargement...</p>;
    }

    return (
        <>
            <Navbar links={clientLinks} />
            <main className="mx-auto max-w-5xl p-6">{children}</main>
        </>
    );
}