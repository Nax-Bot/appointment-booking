"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import AppShellSkeleton from "@/components/layout/AppShellSkeleton";
import LottieLoader from "@/components/ui/LottieLoader";

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

    // Juste après la connexion : le squelette de l'espace du rôle, sans écran blanc
    if (user !== null) {
        return <AppShellSkeleton role={user.role} />;
    }

    if (loading === true) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <LottieLoader kind="spinner" tone="client" size={96} label="Chargement..." />
            </main>
        );
    }

    return (
        <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
            {/* Panneau de présentation (grands écrans) */}
            <aside className="auth-panel m-3 hidden rounded-3xl p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="relative z-10">
                    <span className="text-sm font-bold tracking-[0.28em] text-mint uppercase">Rendez-vous</span>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="animate-rise text-4xl leading-[1.1] font-semibold tracking-tight">
                        Prenez rendez-vous, simplement.
                    </h2>
                    <p className="animate-rise mt-4 text-sm leading-relaxed text-white/75" style={{ animationDelay: "90ms" }}>
                        Horaires, services et réservations de vos clients et professionnels, réunis dans un seul espace.
                    </p>
                </div>
            </aside>

            <section className="flex items-center justify-center p-6 sm:p-10">
                <div className="auth-form animate-rise w-full max-w-sm">
                    {/* Petite étoile de marque, comme sur la maquette */}
                    <svg viewBox="0 0 24 24" className="mb-5 h-8 w-8 text-mint" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
                    </svg>
                    {children}
                </div>
            </section>
        </main>
    );
}
