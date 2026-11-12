"use client";

import { SubmitEvent, useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import { Pencil } from "lucide-react";
import { useSession } from "@/context/session-context";
import { apiGet, apiPatch, ApiError } from "@/lib/lib-front/api-client";
import { Professional, UpdateProfileInput } from "@/types/api";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";

// Mêmes limites que le backend
const SPECIALTY_MAX = 150;
const DESCRIPTION_MAX = 2000;

// Le backend refuse une chaîne vide : pour effacer un champ, il faut envoyer null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") {
        return null;
    }
    return trimmed;
}

// Les initiales affichées dans le rond à la place d'une photo : « Test Front » donne « TF »
function getInitials(firstName: string, lastName: string): string {
    return firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
}

// Une information avec son étiquette au-dessus (« Prénom » puis « Test »).
// Si la valeur est vide, on affiche le texte « emptyText » en gris.
// multiline = true : les retours à la ligne du texte sont conservés.
interface InfoItemProps {
    label: string;
    value: string | null;
    emptyText?: string;
    multiline?: boolean;
}

function InfoItem({
    label,
    value,
    emptyText = "Non renseigné",
    multiline = false,
}: InfoItemProps) {
    let valueClass = "mt-0.5 font-medium text-ink";
    if (multiline) {
        valueClass = valueClass + " whitespace-pre-line";
    }

    return (
        <div>
            <p className="text-sm text-muted">{label}</p>
            {value !== null && value !== "" ? (
                <p className={valueClass}>{value}</p>
            ) : (
                <p className="mt-0.5 text-muted/70 italic">{emptyText}</p>
            )}
        </div>
    );
}

export default function ProProfilePage() {
    const { user } = useSession();

    // Le profil tel qu'il est enregistré dans le backend
    const [profile, setProfile] = useState<Professional | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // La fenêtre de modification et ses deux champs
    const [modalOpen, setModalOpen] = useState(false);
    const [specialtyInput, setSpecialtyInput] = useState("");
    const [descriptionInput, setDescriptionInput] = useState("");

    // Enregistrement
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isDisplay, setIsDisplay] = useState(false);

    // L'identifiant du professionnel = l'identifiant de la session
    let userId: number | null = null;
    if (user !== null) {
        userId = user.userId;
    }

    // Au premier affichage : on lit le profil dans le backend
    useEffect(() => {
        if (userId === null) {
            return;
        }

        async function loadProfile(id: number) {
            try {
                const loaded = await apiGet<Professional>("/api/professionals/" + id);
                setProfile(loaded);
            } catch (error) {
                if (error instanceof ApiError) {
                    setLoadError(error.message);
                } else {
                    setLoadError("Impossible de charger le profil");
                }
            }
            setLoading(false);
        }

        loadProfile(userId);
    }, [userId]);

    // Ouvre la fenêtre, avec les valeurs actuelles dans les champs
    function openEdit() {
        if (profile === null) {
            return;
        }

        let currentSpecialty = "";
        if (profile.specialty !== null) {
            currentSpecialty = profile.specialty;
        }
        let currentDescription = "";
        if (profile.description !== null) {
            currentDescription = profile.description;
        }

        setSpecialtyInput(currentSpecialty);
        setDescriptionInput(currentDescription);
        setErrorMessage("");
        setErrorDetails([]);
        setIsDisplay(false);
        setSuccessMessage("");
        setModalOpen(true);
    }

    // Ferme la fenêtre sans enregistrer (impossible pendant un envoi)
    function closeModal() {
        if (saving) {
            return;
        }
        setModalOpen(false);
    }

    // Erreurs de saisie (le backend les vérifie aussi)
    let specialtyError = "";
    if (specialtyInput.trim().length > SPECIALTY_MAX) {
        specialtyError = "La spécialité est trop longue (150 caractères maximum)";
    }
    let descriptionError = "";
    if (descriptionInput.trim().length > DESCRIPTION_MAX) {
        descriptionError = "La description est trop longue (2000 caractères maximum)";
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setIsDisplay(true);

        // S'il y a une erreur de saisie, on n'envoie rien au backend
        if (specialtyError !== "" || descriptionError !== "") {
            return;
        }

        setSaving(true);

        // On envoie toujours les deux champs ; un champ vide devient null (= effacer)
        const body: UpdateProfileInput = {
            specialty: emptyToNull(specialtyInput),
            description: emptyToNull(descriptionInput),
        };

        try {
            const updated = await apiPatch<Professional>("/api/professionals/me", body);
            // Le backend renvoie le profil enregistré : on l'affiche et on ferme la fenêtre
            setProfile(updated);
            setModalOpen(false);
            setSuccessMessage("Profil enregistré");
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSaving(false);
    }

    if (loading === true) {
        return <PageLoading kind="badge" label="Chargement de votre profil..." />;
    }

    if (loadError !== "") {
        return <ErrorMessage message={loadError} details={[]} isDisplay={isDisplay}/>;
    }

    if (profile === null || user === null) {
        return null;
    }

    // La ligne sous le nom, dans la carte du haut
    let headerSpecialty = "Spécialité non renseignée";
    if (profile.specialty !== null) {
        headerSpecialty = profile.specialty;
    }

    return (
        <div>
            {/* Titre suivi d'un trait */}
            <div className="mb-6 flex items-center gap-4">
                <h1 className="text-2xl font-bold text-ink">Mon profil</h1>
                <div className="h-px flex-1 bg-line" />
            </div>

            <SuccessMessage message={successMessage} />

            {/* Carte du haut : initiales, nom, spécialité, rôle */}
            <section className="mb-6 flex items-center gap-5 rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-tint text-2xl font-bold text-primary">
                    {getInitials(profile.firstName, profile.lastName)}
                </div>
                <div>
                    <p className="text-lg font-bold text-ink">
                        {profile.firstName} {profile.lastName}
                    </p>
                    <p className="text-muted">{headerSpecialty}</p>
                    <span className="mt-2 inline-block rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-primary">
                        Professionnel
                    </span>
                </div>
            </section>

            {/* Informations personnelles : lecture seule */}
            <section className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div className="mb-5 border-b border-line pb-3">
                    <h2 className="text-lg font-semibold text-primary">Informations personnelles</h2>
                    <p className="text-sm text-muted">
                        Visibles par vous seulement. Elles ne sont pas modifiables ici.
                    </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                    <InfoItem label="Prénom" value={user.firstName} />
                    <InfoItem label="Nom" value={user.lastName} />
                    <InfoItem label="Rôle" value="Professionnel" />
                    <InfoItem label="Adresse e-mail" value={user.email} />
                    <InfoItem label="Téléphone" value={user.phoneNumber} />
                </div>
            </section>

            {/* Présentation professionnelle : c'est elle qu'on peut modifier */}
            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-3">
                    <div>
                        <h2 className="text-lg font-semibold text-primary">Présentation professionnelle</h2>
                        <p className="text-sm text-muted">
                            Visible par les clients, avec votre nom. Votre e-mail et votre téléphone ne leur
                            sont jamais montrés.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openEdit}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-tint"
                    >
                        <Pencil className="h-4 w-4" />
                        Modifier
                    </button>
                </div>
                <div className="grid gap-6">
                    <InfoItem label="Spécialité" value={profile.specialty} emptyText="Non renseignée" />
                    <InfoItem
                        label="Description"
                        value={profile.description}
                        emptyText="Non renseignée"
                        multiline={true}
                    />
                </div>
            </section>

            {/* La fenêtre de modification */}
            <Modal open={modalOpen} title="Modifier ma présentation" onClose={closeModal}>
                <form onSubmit={handleSubmit}>
                    <ErrorMessage message={errorMessage} details={errorDetails} isDisplay={isDisplay}/>

                    <Input
                        label="Spécialité"
                        placeholder="Ex. Médecin généraliste"
                        value={specialtyInput}
                        onChange={setSpecialtyInput}
                        error={specialtyError}
                        maxLength={SPECIALTY_MAX}
                    />

                    <Textarea
                        label="Description"
                        placeholder="Présentez-vous en quelques lignes"
                        value={descriptionInput}
                        onChange={setDescriptionInput}
                        error={descriptionError}
                        maxLength={DESCRIPTION_MAX}
                    />

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" fullWidth={false} onClick={closeModal} disabled={saving}>
                            Annuler
                        </Button>
                        <Button type="submit" fullWidth={false} loading={saving}>
                            {saving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}