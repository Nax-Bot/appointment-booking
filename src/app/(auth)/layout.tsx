"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";

// Enveloppe des pages publiques (connexion, inscription).
// Si quelqu'un est connecté, on l'envoie vers "/".
// C'est aussi ce qui fait avancer la page juste après une connexion réussie.
export default function AuthLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (loading === false && user !== null) {
            router.replace("/");
        }
    }, [loading, user, router]);

    if (loading === true || user !== null) {
        return <p className="p-8">Chargement...</p>;
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-soft bg-white p-8 shadow-sm">
                {children}
            </div>
        </main>
    );
}