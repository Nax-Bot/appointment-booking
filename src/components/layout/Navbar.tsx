"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSession } from "@/context/session-context";

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

    async function handleLogout() {
        try {
            await logout();
            // Une fois la session vidée, le layout de l'espace renvoie vers /login
        } catch (error) {
            console.error(error);
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
        <header className="border-b border-line bg-white">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
                <div className="flex flex-wrap items-center gap-6">
                    <span className="text-lg font-bold text-primary">Rendez-vous</span>

                    <nav className="flex flex-wrap gap-1">
                        {/* map = un lien par élément de la liste */}
                        {links.map((link) => {
                            // Le lien de la page où l'on est se met en évidence
                            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                            let linkClass = "text-ink hover:bg-tint";
                            if (isActive) {
                                linkClass = "bg-tint font-semibold text-primary";
                            }

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={"rounded-lg px-3 py-1.5 text-sm " + linkClass}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {user !== null && (
                        <div className="text-right text-sm leading-tight">
                            <p className="font-medium text-ink">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-muted">{roleLabel}</p>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-tint"
                    >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                    </button>
                </div>
            </div>
        </header>
    );
}