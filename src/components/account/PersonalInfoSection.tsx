"use client";

import { SubmitEvent, useState } from "react";
import { Lock } from "lucide-react";
import { apiPatch, ApiError } from "@/lib/client/api-client";
import { useSession } from "@/context/session-context";
import { Profile, UpdateAccountInput } from "@/types/account";
import { NAME_CHANGE_COOLDOWN_DAYS } from "@/lib/client/account-rules";
import { formatLongDate } from "@/lib/client/format/unavailability-format";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";

// La carte « Mes informations » : prénom, nom, téléphone, et pour un client date de naissance + adresse.
// On n'envoie au backend QUE ce qui a changé.
// - Nom et prénom ne se changent qu'une fois tous les 30 jours : après une modification (ou une réponse 409),
//   les deux champs sont grisés avec la date de la prochaine possibilité.
// - L'adresse e-mail n'est pas modifiable.
// - Date de naissance et adresse ne sont pas renvoyées par /api/auth/me : on les laisse vides au départ.
//   Un champ vide = « on ne touche pas » ; pour effacer une valeur, utiliser le bouton « Effacer ».
export default function PersonalInfoSection() {
    const { user, updateUser } = useSession();

    const [firstName, setFirstName] = useState(user === null ? "" : user.firstName);
    const [lastName, setLastName] = useState(user === null ? "" : user.lastName);
    const [phone, setPhone] = useState(user === null || user.phoneNumber === null ? "" : user.phoneNumber);
    const [birthDate, setBirthDate] = useState("");
    const [address, setAddress] = useState("");
    // Valeurs actuellement enregistrées (connues après un enregistrement), pour l'affichage et « Effacer »
    const [savedBirthDate, setSavedBirthDate] = useState<string | null>(null);
    const [savedAddress, setSavedAddress] = useState<string | null>(null);
    const [clearBirthDate, setClearBirthDate] = useState(false);
    const [clearAddress, setClearAddress] = useState(false);

    const [nameLockedUntil, setNameLockedUntil] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");

    if (user === null) {
        return null;
    }
    const isClient = user.role === "CLIENT";

    const nameLocked = nameLockedUntil !== null && new Date(nameLockedUntil).getTime() > Date.now();

    const firstNameError = touched && firstName.trim() === "" ? "Le prénom ne peut pas être vide" : "";
    const lastNameError = touched && lastName.trim() === "" ? "Le nom ne peut pas être vide" : "";
    const phoneError = touched && phone.length > 30 ? "Le numéro de téléphone est trop long" : "";

    // Construit uniquement ce qui a changé
    function buildChanges(): UpdateAccountInput {
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
        const currentPhone = user.phoneNumber === null ? "" : user.phoneNumber;
        if (phone.trim() !== currentPhone) {
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

    const changes = buildChanges();
    const hasChanges = Object.keys(changes).length > 0;

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched(true);
        setSuccessMessage("");
        if (firstName.trim() === "" || lastName.trim() === "" || phone.length > 30 || hasChanges === false) {
            return;
        }

        setErrorMessage("");
        setErrorDetails([]);
        setSaving(true);
        try {
            const profile = await apiPatch<Profile>("/api/users/me", changes);
            updateUser({
                firstName: profile.firstName,
                lastName: profile.lastName,
                phoneNumber: profile.phoneNumber,
            });
            setFirstName(profile.firstName);
            setLastName(profile.lastName);
            setPhone(profile.phoneNumber === null ? "" : profile.phoneNumber);
            setNameLockedUntil(profile.nameChangeAvailableAt);
            if (isClient) {
                setSavedBirthDate(profile.birthDate);
                setSavedAddress(profile.address);
                setBirthDate("");
                setAddress("");
                setClearBirthDate(false);
                setClearAddress(false);
            }
            setTouched(false);
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
        <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-line pb-3">
                <h2 className="text-lg font-semibold text-primary">Mes informations</h2>
                <p className="text-sm text-muted">Les informations de votre compte.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <SuccessMessage message={successMessage} />
                <ErrorMessage message={errorMessage} details={errorDetails} />

                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Input
                        label="Prénom"
                        value={firstName}
                        onChange={setFirstName}
                        error={firstNameError}
                        maxLength={100}
                        disabled={nameLocked}
                    />
                    <Input
                        label="Nom"
                        value={lastName}
                        onChange={setLastName}
                        error={lastNameError}
                        maxLength={100}
                        disabled={nameLocked}
                    />
                </div>
                <p className="-mt-2 mb-4 flex items-start gap-1.5 text-xs text-muted">
                    <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                    {nameLocked && nameLockedUntil !== null
                        ? "Vous pourrez modifier votre nom à partir du " + formatLongDate(nameLockedUntil.slice(0, 10)) + "."
                        : "Le nom et le prénom ne peuvent être modifiés qu'une fois tous les " + NAME_CHANGE_COOLDOWN_DAYS + " jours."}
                </p>

                <Input label="Adresse e-mail" value={user.email} onChange={() => {}} disabled={true} />
                <Input
                    label="Téléphone"
                    type="tel"
                    placeholder="Ex. 034 12 345 67"
                    value={phone}
                    onChange={setPhone}
                    error={phoneError}
                />

                {isClient && (
                    <>
                        <Input
                            label={"Date de naissance" + (savedBirthDate !== null && clearBirthDate === false ? " (actuelle : " + formatLongDate(savedBirthDate) + ")" : "")}
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

                <div className="flex justify-end">
                    <Button type="submit" fullWidth={false} loading={saving} disabled={hasChanges === false}>
                        Enregistrer
                    </Button>
                </div>
            </form>
        </section>
    );
}
