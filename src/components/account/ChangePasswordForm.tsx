"use client";

import { SubmitEvent, useState } from "react";
import { apiPost, ApiError } from "@/lib/client/api-client";
import { getPasswordRuleError } from "@/lib/client/validation/form-validation";
import { ChangePasswordInput, MessageResult } from "@/types/account";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";

// Le formulaire « Changer mon mot de passe » (affiché dans une fenêtre) :
// ancien mot de passe, puis le nouveau deux fois.
// Le backend limite les essais ratés sur l'ancien mot de passe : après plusieurs erreurs il répond 429
// avec « Réessayez dans X minute(s) » (affiché tel quel).
interface ChangePasswordFormProps {
    onDone: () => void; // appelée quand le mot de passe est changé
    onCancel: () => void;
}

export default function ChangePasswordForm({ onDone, onCancel }: ChangePasswordFormProps) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [currentError, setCurrentError] = useState("");

    let newError = "";
    if (next !== "") {
        newError = getPasswordRuleError(next);
    } else if (submitted) {
        newError = "Le nouveau mot de passe est obligatoire";
    }
    let confirmError = "";
    if (confirm !== "" && confirm !== next) {
        confirmError = "Les deux mots de passe sont différents";
    } else if (submitted && confirm === "") {
        confirmError = "Confirmez le nouveau mot de passe";
    }
    const currentMissing = submitted && current === "" ? "Le mot de passe actuel est obligatoire" : "";
    const sameAsOld = next !== "" && next === current ? "Le nouveau mot de passe doit être différent de l'actuel" : "";

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitted(true);
        if (current === "" || next === "" || newError !== "" || confirm !== next || sameAsOld !== "") {
            return;
        }

        setErrorMessage("");
        setErrorDetails([]);
        setCurrentError("");
        setSaving(true);
        const body: ChangePasswordInput = { currentPassword: current, newPassword: next };
        try {
            await apiPost<MessageResult>("/api/users/me/password", body);
            setSaving(false);
            onDone();
            return;
        } catch (error) {
            if (error instanceof ApiError) {
                // Le détail « currentPassword : ... » s'affiche sous le bon champ
                const wrongCurrent = error.details.find((detail) => detail.startsWith("currentPassword"));
                if (wrongCurrent !== undefined) {
                    setCurrentError("Mot de passe actuel incorrect");
                } else {
                    setErrorMessage(error.message);
                    setErrorDetails(error.details);
                }
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }
        setSaving(false);
    }

    return (
        <form onSubmit={handleSubmit}>
            <ErrorMessage message={errorMessage} details={errorDetails} />

            <PasswordInput
                label="Mot de passe actuel"
                value={current}
                onChange={(value) => {
                    setCurrent(value);
                    setCurrentError("");
                }}
                error={currentError !== "" ? currentError : currentMissing}
            />
            <PasswordInput
                label="Nouveau mot de passe"
                value={next}
                onChange={setNext}
                error={newError !== "" ? newError : sameAsOld}
                showStrength={true}
            />
            <PasswordInput label="Confirmer le nouveau mot de passe" value={confirm} onChange={setConfirm} error={confirmError} />

            <div className="mt-2 flex justify-end gap-3">
                <Button variant="secondary" fullWidth={false} disabled={saving} onClick={onCancel}>
                    Annuler
                </Button>
                <Button type="submit" fullWidth={false} loading={saving}>
                    Changer le mot de passe
                </Button>
            </div>
        </form>
    );
}
