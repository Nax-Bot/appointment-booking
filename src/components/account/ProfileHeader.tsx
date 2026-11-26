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
            <div className="h-24 bg-gradient-to-r from-deep via-primary to-mint/80 sm:h-28" />

            <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="-mt-10 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-tint text-3xl font-bold text-primary shadow-sm">
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
                            <span className="flex items-center gap-1.5 text-primary">
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
