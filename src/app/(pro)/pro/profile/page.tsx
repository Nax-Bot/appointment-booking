"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/context/session-context";
import { apiGet, ApiError } from "@/lib/client/api-client";
import { Professional } from "@/types/api";
import PageLoading from "@/components/ui/PageLoading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import ProfileHeader from "@/components/account/ProfileHeader";
import AccountCard from "@/components/account/AccountCard";
import PaymentAccountSection from "@/components/payments/PaymentAccountSection";

// La page « Mon profil » du professionnel :
// en haut sa carte de présentation, puis à gauche UNE carte d'informations personnelles
// (nom, contact, spécialité, description, mot de passe) et à droite le paiement en ligne.
export default function ProProfilePage() {
    const { user } = useSession();

    // La présentation telle qu'elle est enregistrée dans le backend
    const [profile, setProfile] = useState<Professional | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    // La fenêtre « Modifier » est ouverte par le crayon de la carte ou par le bouton de l'en-tête
    const [editOpen, setEditOpen] = useState(false);

    // L'identifiant du professionnel = l'identifiant de la session
    const userId = user === null ? null : user.userId;

    useEffect(() => {
        if (userId === null) {
            return;
        }

        async function loadProfile(id: number) {
            try {
                setProfile(await apiGet<Professional>("/api/professionals/" + id));
            } catch (error) {
                setLoadError(error instanceof ApiError ? error.message : "Impossible de charger le profil");
            }
            setLoading(false);
        }

        loadProfile(userId);
    }, [userId]);

    if (loading === true) {
        return <PageLoading kind="badge" label="Chargement de votre profil..." />;
    }

    if (loadError !== "") {
        return <ErrorMessage message={loadError} details={[]} />;
    }

    if (profile === null || user === null) {
        return null;
    }

    return (
        <div>
            <ProfileHeader subtitle={profile.specialty ?? "Spécialité non renseignée"} onEdit={() => setEditOpen(true)} />

            <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
                <AccountCard
                    editOpen={editOpen}
                    onEditOpenChange={setEditOpen}
                    professional={profile}
                    onProfessionalChange={setProfile}
                />
                <PaymentAccountSection />
            </div>
        </div>
    );
}
