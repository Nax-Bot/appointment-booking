"use client";

import { ReactNode, SubmitEvent, useEffect, useState } from "react";
import { KeyRound, Lock, Pencil } from "lucide-react";
import { apiPatch, ApiError } from "@/lib/client/api-client";
import { useSession } from "@/context/session-context";
import { Professional, UpdateProfileInput } from "@/types/api";
import { Profile, UpdateAccountInput } from "@/types/account";
import { NAME_CHANGE_COOLDOWN_DAYS } from "@/lib/client/account-rules";
import { formatLongDate } from "@/lib/client/format/unavailability-format";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";

// Mêmes limites que le backend
const SPECIALTY_MAX = 150;
const DESCRIPTION_MAX = 2000;

// Le backend refuse une chaîne vide pour la présentation : pour effacer, on envoie null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    return trimmed === "" ? null : trimmed;
}

// Une ligne de la carte : l'étiquette en petit, la valeur dessous, un trait fin entre les lignes
function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-b border-line py-3.5 last:border-b-0">
            <p className="text-xs text-muted">{label}</p>
            <div className="mt-0.5 text-sm font-medium text-ink">{children}</div>
        </div>
    );
}

function Empty({ text = "Non renseigné" }: { text?: string }) {
    return <span className="font-normal text-muted/70 italic">{text}</span>;
}

// LA carte unique « Informations personnelles » (client et professionnel).
// Un seul crayon (ou le bouton « Modifier le profil » de l'en-tête) ouvre UNE fenêtre qui contient
// tout ce qui se modifie : nom, téléphone, et pour le professionnel sa présentation.
// Le mot de passe a sa ligne avec son propre bouton.
//
// Côté backend, ça reste deux routes : PATCH /api/users/me (compte) et PATCH /api/professionals/me (présentation).
// On n'appelle chacune que si quelque chose a changé.
interface AccountCardProps {
    editOpen: boolean;
    onEditOpenChange: (open: boolean) => void;
    // Professionnel seulement : sa présentation (spécialité, description)
    professional?: Professional | null;
    onProfessionalChange?: (profile: Professional) => void;
}

export default function AccountCard({ editOpen, onEditOpenChange, professional = null, onProfessionalChange }: AccountCardProps) {
    const { user, updateUser } = useSession();
    const isPro = user !== null && user.role === "PROFESSIONAL";
    const isClient = user !== null && user.role === "CLIENT";

    // Champs de la fenêtre (remplis à l'ouverture)
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [description, setDescription] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [address, setAddress] = useState("");
    const [clearBirthDate, setClearBirthDate] = useState(false);
    const [clearAddress, setClearAddress] = useState(false);

    // Ce que le backend a renvoyé et qu'on connaît (date de naissance et adresse ne sont pas dans /api/auth/me)
    const [savedBirthDate, setSavedBirthDate] = useState<string | null>(null);
    const [savedAddress, setSavedAddress] = useState<string | null>(null);
    const [nameLockedUntil, setNameLockedUntil] = useState<string | null>(null);

    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [passwordOpen, setPasswordOpen] = useState(false);

    // À chaque ouverture de la fenêtre : on repart des valeurs enregistrées
    useEffect(() => {
        if (editOpen === false || user === null) {
            return;
        }
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setPhone(user.phoneNumber ?? "");
        setSpecialty(professional?.specialty ?? "");
        setDescription(professional?.description ?? "");
        setBirthDate("");
        setAddress("");
        setClearBirthDate(false);
        setClearAddress(false);
        setTouched(false);
        setErrorMessage("");
        setErrorDetails([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editOpen]);

    if (user === null) {
        return null;
    }

    const nameLocked = nameLockedUntil !== null && new Date(nameLockedUntil).getTime() > Date.now();

    const firstNameError = touched && firstName.trim() === "" ? "Le prénom ne peut pas être vide" : "";
    const lastNameError = touched && lastName.trim() === "" ? "Le nom ne peut pas être vide" : "";
    const phoneError = touched && phone.length > 30 ? "Le numéro de téléphone est trop long" : "";
    const specialtyError = specialty.length > SPECIALTY_MAX ? "La spécialité est trop longue" : "";
    const descriptionError = description.length > DESCRIPTION_MAX ? "La description est trop longue" : "";

    // Ce qui a changé côté compte (on n'envoie que ça)
    function buildAccountChanges(): UpdateAccountInput {
        const changes: UpdateAccountInput = {};
        if (user === null) {
            return changes;
        }
        if (nameLocked === false) {
            if (firstName.trim() !== user.firstName) {
                changes.firstName = firstName.trim();
            }
            if (lastName.trim() !== user.lastName) {
                changes.lastName = lastName.trim();
            }
        }
        if (phone.trim() !== (user.phoneNumber ?? "")) {
            changes.phoneNumber = phone.trim() === "" ? null : phone.trim();
        }
        if (isClient) {
            if (clearBirthDate) {
                changes.birthDate = null;
            } else if (birthDate !== "") {
                changes.birthDate = birthDate;
            }
            if (clearAddress) {
                changes.address = null;
            } else if (address.trim() !== "") {
                changes.address = address.trim();
            }
        }
        return changes;
    }

    const accountChanges = buildAccountChanges();
    const proChanged =
        isPro &&
        professional !== null &&
        (specialty.trim() !== (professional.specialty ?? "") || description.trim() !== (professional.description ?? ""));
    const hasChanges = Object.keys(accountChanges).length > 0 || proChanged;

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched(true);
        if (
            firstName.trim() === "" ||
            lastName.trim() === "" ||
            phone.length > 30 ||
            specialtyError !== "" ||
            descriptionError !== "" ||
            hasChanges === false
        ) {
            return;
        }

        setErrorMessage("");
        setErrorDetails([]);
        setSaving(true);
        try {
            if (Object.keys(accountChanges).length > 0) {
                const profile = await apiPatch<Profile>("/api/users/me", accountChanges);
                updateUser({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    phoneNumber: profile.phoneNumber,
                });
                setNameLockedUntil(profile.nameChangeAvailableAt);
                if (isClient) {
                    setSavedBirthDate(profile.birthDate);
                    setSavedAddress(profile.address);
                }
            }
            if (proChanged) {
                // On envoie toujours les deux champs ; un champ vide devient null (= effacer)
                const body: UpdateProfileInput = {
                    specialty: emptyToNull(specialty),
                    description: emptyToNull(description),
                };
                const updated = await apiPatch<Professional>("/api/professionals/me", body);
                if (onProfessionalChange !== undefined) {
                    onProfessionalChange(updated);
                }
            }
            onEditOpenChange(false);
            setSuccessMessage("Vos informations ont été enregistrées");
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
                // 409 : nom déjà changé récemment. Le détail contient « ... à partir du AAAA-MM-JJ »
                if (error.statusCode === 409) {
                    const match = /(\d{4}-\d{2}-\d{2})/.exec(error.details.join(" "));
                    if (match !== null) {
                        setNameLockedUntil(match[1] + "T00:00:00.000Z");
                    }
                }
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }
        setSaving(false);
    }

    return (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-ink">Informations personnelles</h2>
                <button
                    type="button"
                    onClick={() => onEditOpenChange(true)}
                    title="Modifier"
                    aria-label="Modifier mes informations"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-primary"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </div>

            <SuccessMessage message={successMessage} />

            <div>
                <Row label="Prénom et nom">
                    {user.firstName} {user.lastName}
                </Row>
                <Row label="Adresse e-mail">{user.email}</Row>
                <Row label="Téléphone">{user.phoneNumber ? user.phoneNumber : <Empty />}</Row>

                {isPro && (
                    <>
                        <Row label="Spécialité">{professional?.specialty ? professional.specialty : <Empty />}</Row>
                        <Row label="Description">
                            {professional?.description ? (
                                <span className="font-normal whitespace-pre-line">{professional.description}</span>
                            ) : (
                                <Empty />
                            )}
                        </Row>
                    </>
                )}

                {isClient && (savedBirthDate !== null || savedAddress !== null) && (
                    <>
                        <Row label="Date de naissance">{savedBirthDate ? formatLongDate(savedBirthDate.slice(0, 10)) : <Empty />}</Row>
                        <Row label="Adresse">{savedAddress ? savedAddress : <Empty />}</Row>
                    </>
                )}

                <Row label="Mot de passe">
                    <div className="flex items-center justify-between gap-3">
                        <span className="tracking-widest text-muted">••••••••••</span>
                        <button
                            type="button"
                            onClick={() => setPasswordOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-all hover:bg-tint active:scale-95"
                        >
                            <KeyRound className="h-3.5 w-3.5" />
                            Changer
                        </button>
                    </div>
                </Row>
            </div>

            {/* UNE fenêtre pour tout modifier */}
            <Modal open={editOpen} title="Modifier mon profil" wide={true} onClose={() => (saving ? undefined : onEditOpenChange(false))}>
                <form onSubmit={handleSubmit}>
                    <ErrorMessage message={errorMessage} details={errorDetails} />

                    <div className="grid gap-x-4 sm:grid-cols-2">
                        <Input label="Prénom" value={firstName} onChange={setFirstName} error={firstNameError} maxLength={100} disabled={nameLocked} />
                        <Input label="Nom" value={lastName} onChange={setLastName} error={lastNameError} maxLength={100} disabled={nameLocked} />
                    </div>
                    <p className="-mt-2 mb-4 flex items-start gap-1.5 text-xs text-muted">
                        <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                        {nameLocked && nameLockedUntil !== null
                            ? "Vous pourrez modifier votre nom à partir du " + formatLongDate(nameLockedUntil.slice(0, 10)) + "."
                            : "Le nom et le prénom ne peuvent être modifiés qu'une fois tous les " + NAME_CHANGE_COOLDOWN_DAYS + " jours."}
                    </p>

                    <Input label="Adresse e-mail (non modifiable)" value={user.email} onChange={() => {}} disabled={true} />
                    <Input
                        label="Téléphone"
                        type="tel"
                        placeholder="Ex. 034 12 345 67"
                        value={phone}
                        onChange={setPhone}
                        error={phoneError}
                    />

                    {isPro && (
                        <>
                            <Input
                                label="Spécialité"
                                placeholder="Ex. Médecin généraliste"
                                value={specialty}
                                onChange={setSpecialty}
                                error={specialtyError}
                                maxLength={SPECIALTY_MAX}
                            />
                            <Textarea
                                label="Description (visible par vos clients)"
                                placeholder="Présentez-vous en quelques lignes"
                                value={description}
                                onChange={setDescription}
                                error={descriptionError}
                                maxLength={DESCRIPTION_MAX}
                            />
                        </>
                    )}

                    {isClient && (
                        <>
                            <Input
                                label={"Date de naissance" + (savedBirthDate !== null && clearBirthDate === false ? " (actuelle : " + formatLongDate(savedBirthDate.slice(0, 10)) + ")" : "")}
                                type="date"
                                value={clearBirthDate ? "" : birthDate}
                                onChange={(value) => {
                                    setBirthDate(value);
                                    setClearBirthDate(false);
                                }}
                            />
                            <Input
                                label={"Adresse" + (savedAddress !== null && clearAddress === false ? " (actuelle : " + savedAddress + ")" : "")}
                                placeholder="Ex. Lot II B 12, Antananarivo"
                                value={clearAddress ? "" : address}
                                onChange={(value) => {
                                    setAddress(value);
                                    setClearAddress(false);
                                }}
                                maxLength={255}
                            />
                            <p className="-mt-2 mb-4 text-xs text-muted">
                                Laissez ces deux champs vides pour les garder tels quels.{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBirthDate("");
                                        setClearBirthDate(true);
                                    }}
                                    className="text-primary hover:underline"
                                >
                                    Effacer la date
                                </button>
                                {" · "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddress("");
                                        setClearAddress(true);
                                    }}
                                    className="text-primary hover:underline"
                                >
                                    Effacer l&apos;adresse
                                </button>
                                {(clearBirthDate || clearAddress) && " — sera effacé à l'enregistrement"}
                            </p>
                        </>
                    )}

                    <div className="mt-2 flex justify-end gap-3">
                        <Button variant="secondary" fullWidth={false} disabled={saving} onClick={() => onEditOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" fullWidth={false} loading={saving} disabled={hasChanges === false}>
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* La fenêtre du mot de passe */}
            <Modal open={passwordOpen} title="Changer mon mot de passe" onClose={() => setPasswordOpen(false)}>
                <ChangePasswordForm
                    onCancel={() => setPasswordOpen(false)}
                    onDone={() => {
                        setPasswordOpen(false);
                        setSuccessMessage("Mot de passe modifié. Un e-mail de confirmation vous a été envoyé.");
                    }}
                />
            </Modal>
        </section>
    );
}
