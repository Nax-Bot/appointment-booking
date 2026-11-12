"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LogOut } from "lucide-react";
import { useSession } from "@/context/session-context";
import { getInitials } from "@/lib/lib-front/text-helpers";
import RoutePrefetcher from "@/components/layout/RoutePrefetcher";
import LottieLoader from "@/components/ui/LottieLoader";

// Un lien de la barre de navigation
export interface NavLink {
    href: string;
    label: string;
}

// links = les liens à afficher : ils changent selon le rôle (le layout les donne)
interface NavbarProps {
    links: NavLink[];
}

export default function Navbar({ links }: NavbarProps) {
    const { user, logout } = useSession();
    const pathname = usePathname(); // l'adresse de la page actuelle, par exemple "/services"
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await logout();
            // Une fois la session vidée, le layout de l'espace renvoie vers /login
        } catch (error) {
            console.error(error);
            setLoggingOut(false);
        }
    }

    // Le texte affiché sous le nom de la personne
    let roleLabel = "";
    if (user !== null) {
        if (user.role === "CLIENT") {
            roleLabel = "Client";
        } else {
            roleLabel = "Professionnel";
        }
    }

    return (
        // Sur grand écran : colonne fixe à GAUCHE. Sur petit écran : bandeau en haut.
        <aside className="order-first border-b border-line/80 bg-white/80 backdrop-blur-md lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
            {/* Toutes les pages de l'espace sont préchargées en arrière-plan */}
            <RoutePrefetcher hrefs={links.map((link) => link.href)} />

            <div className="flex h-full flex-col gap-3 p-3 lg:gap-6 lg:p-5">
                <div className="flex items-center justify-between">
                    <Link href="/" className="group flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
                            <CalendarCheck className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-bold tracking-tight text-ink">Rendez-vous</span>
                    </Link>

                    {/* Petit écran : déconnexion en icône dans le bandeau */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        title="Déconnexion"
                        aria-label="Déconnexion"
                        className="flex items-center rounded-lg border border-line bg-white p-2 text-ink transition-all hover:bg-tint active:scale-95 disabled:opacity-70 lg:hidden"
                    >
                        {loggingOut ? <LottieLoader kind="dots" size={22} className="-m-1" /> : <LogOut className="h-4 w-4" />}
                    </button>
                </div>

                <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
                    <p className="mb-1 hidden px-3 text-xs font-semibold tracking-wider text-muted uppercase lg:block">
                        Menu
                    </p>
                    {/* map = un lien par élément de la liste */}
                    {links.map((link) => {
                        // Le lien de la page où l'on est se met en évidence
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                        let linkClass = "text-ink/80 hover:bg-tint hover:text-ink lg:hover:translate-x-0.5";
                        if (isActive) {
                            linkClass = "bg-tint font-semibold text-primary";
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={
                                    "relative shrink-0 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-all duration-200 lg:py-2.5 " +
                                    linkClass
                                }
                            >
                                {link.label}
                                {/* Le trait sur le bord gauche du lien actif (grand écran) / sous le lien (petit écran) */}
                                <span
                                    className={
                                        "absolute right-3 bottom-0 left-3 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300 lg:top-2 lg:right-auto lg:bottom-2 lg:left-0 lg:h-auto lg:w-1 lg:origin-center " +
                                        (isActive ? "scale-100" : "scale-0")
                                    }
                                />
                            </Link>
                        );
                    })}
                </nav>

                {/* Grand écran : la personne connectée et la déconnexion, en bas de la colonne */}
                <div className="hidden lg:block">
                    {user !== null && (
                        <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-sm font-bold text-white ring-2 ring-white">
                                {getInitials(user.firstName, user.lastName)}
                            </div>
                            <div className="min-w-0 text-sm leading-tight">
                                <p className="truncate font-medium text-ink">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs font-medium text-primary">{roleLabel}</p>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition-all hover:border-primary/40 hover:bg-tint active:scale-95 disabled:opacity-70"
                    >
                        {loggingOut ? <LottieLoader kind="dots" size={26} className="-my-1" /> : <LogOut className="h-4 w-4" />}
                        Déconnexion
                    </button>
                </div>
            </div>
        </aside>
    );
}
