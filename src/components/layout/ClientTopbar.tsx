"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LogOut } from "lucide-react";
import { useSession } from "@/context/session-context";
import { getInitials } from "@/lib/lib-front/text-helpers";
import RoutePrefetcher from "@/components/layout/RoutePrefetcher";
import LottieLoader from "@/components/ui/LottieLoader";
import { NavLink } from "@/components/layout/Navbar";

// La barre de navigation du CLIENT : un bandeau en haut de la page.
// (Le professionnel garde sa colonne à gauche : Navbar.)
export default function ClientTopbar({ links }: { links: NavLink[] }) {
    const { user, logout } = useSession();
    const pathname = usePathname();
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            console.error(error);
            setLoggingOut(false);
        }
    }

    return (
        <header className="sticky top-0 z-30 border-b border-line/70 bg-white/75 backdrop-blur-xl">
            <RoutePrefetcher hrefs={links.map((link) => link.href)} />

            <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-8 lg:px-12">
                <Link href="/" className="group flex shrink-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
                        <CalendarCheck className="h-5 w-5" />
                    </span>
                    <span className="hidden text-lg font-bold tracking-tight text-ink sm:block">Rendez-vous</span>
                </Link>

                <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:ml-6 sm:gap-1">
                    {links.map((link) => {
                        let isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        // Les pages « professionnels » font partie de l'accueil (recherche)
                        if (link.href === "/services" && pathname.startsWith("/professionals")) {
                            isActive = true;
                        }
                        let linkClass = "text-ink/70 hover:bg-tint hover:text-ink";
                        if (isActive) {
                            linkClass = "bg-tint font-semibold text-primary";
                        }
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={
                                    "shrink-0 rounded-full px-3 py-2 text-sm whitespace-nowrap sm:px-4 transition-all duration-200 " +
                                    linkClass
                                }
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {user !== null && (
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-white py-1 pr-1 pl-1 shadow-sm sm:pl-1.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-xs font-bold text-white">
                            {getInitials(user.firstName, user.lastName)}
                        </span>
                        <span className="hidden max-w-32 truncate text-sm font-medium text-ink md:block">
                            {user.firstName}
                        </span>
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            title="Déconnexion"
                            aria-label="Déconnexion"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/70 transition-all hover:bg-tint hover:text-ink active:scale-95 disabled:opacity-70"
                        >
                            {loggingOut ? <LottieLoader kind="dots" size={22} /> : <LogOut className="h-4 w-4" />}
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
