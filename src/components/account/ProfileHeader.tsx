"use client";

import { Mail, Pencil, Phone, ShieldCheck } from "lucide-react";
import { useSession } from "@/context/session-context";
import { getInitials } from "@/lib/client/format/text-helpers";

// La grande carte du haut d'une page de profil : rond d'initiales, nom, ligne de présentation,
// coordonnées, et le bouton « Modifier le profil ».
interface ProfileHeaderProps {
    subtitle: string; // sous le nom : la spécialité du professionnel, ou « Client »
    onEdit: () => void;
}

export default function ProfileHeader({ subtitle, onEdit }: ProfileHeaderProps) {
    const { user } = useSession();
    if (user === null) {
        return null;
    }

    return (
        <section className="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            {/* Bandeau de couleur, comme une photo de couverture */}
            <div className="relative h-24 overflow-hidden bg-gradient-to-r from-deep via-primary to-accent sm:h-28">
                <span className="absolute -top-10 right-16 h-32 w-32 rounded-full bg-white/10 blur-xl" />
                <span className="absolute -right-6 -bottom-12 h-36 w-36 rounded-full bg-mint/30 blur-2xl" />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="relative -mt-10 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-accent-soft text-3xl font-bold text-accent shadow-sm">
                        {getInitials(user.firstName, user.lastName)}
                    </div>
                    <div className="pb-1">
                        <h1 className="text-xl font-bold tracking-tight text-ink">
                            {user.firstName} {user.lastName}
                        </h1>
                        <p className="text-sm text-muted">{subtitle}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                            <span className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {user.email}
                            </span>
                            {user.phoneNumber !== null && user.phoneNumber !== undefined && user.phoneNumber !== "" && (
                                <span className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    {user.phoneNumber}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {user.role === "PROFESSIONAL" ? "Professionnel" : "Client"}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onEdit}
                    className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:bg-tint active:scale-95"
                >
                    <Pencil className="h-4 w-4" />
                    Modifier le profil
                </button>
            </div>
        </section>
    );
}
