"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ShieldCheck, Clock, Users } from "lucide-react";
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
        <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
            {/* Panneau de présentation (grands écrans) */}
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-green-900 via-emerald-950 to-black p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="relative flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                        <CalendarCheck className="h-5 w-5" />
                    </span>
                    <span className="text-xl font-bold tracking-tight">Rendez-vous</span>
                </div>

                <div className="relative max-w-md">
                    <h2 className="animate-rise text-4xl leading-tight font-bold">
                        Prenez rendez-vous, simplement.
                    </h2>
                    <p className="animate-rise mt-4 text-lg text-white/75" style={{ animationDelay: "90ms" }}>
                        Clients et professionnels se retrouvent au même endroit : horaires, services et
                        réservations en quelques clics.
                    </p>
                    <ul className="stagger mt-8 space-y-3 text-white/90">
                        <li style={{ "--i": 2 } as React.CSSProperties} className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-emerald-300" /> Créneaux libres en temps réel
                        </li>
                        <li style={{ "--i": 3 } as React.CSSProperties} className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-emerald-300" /> Des professionnels près de vous
                        </li>
                        <li style={{ "--i": 4 } as React.CSSProperties} className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-300" /> Vos rendez-vous, toujours sous contrôle
                        </li>
                    </ul>
                </div>

                <p className="relative text-sm text-white/50">© Rendez-vous</p>
            </aside>

            <section className="flex items-center justify-center p-4 sm:p-8">
                <div className="animate-rise w-full max-w-md rounded-2xl border border-line bg-white/90 p-8 shadow-xl shadow-green-900/5 backdrop-blur">
                    {children}
                </div>
            </section>
        </main>
    );
}
