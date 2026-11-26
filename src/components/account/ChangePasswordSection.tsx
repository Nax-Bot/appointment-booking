"use client";

import { SubmitEvent, useState } from "react";
import { apiPost, ApiError } from "@/lib/client/api-client";
import { getPasswordRuleError } from "@/lib/client/validation/form-validation";
import { ChangePasswordInput, MessageResult } from "@/types/account";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";

// La carte « Mot de passe » : on saisit l'ancien, puis le nouveau deux fois.
// Le backend limite les erreurs sur l'ancien mot de passe : après plusieurs essais ratés, il répond 429
// avec « Réessayez dans X minute(s) » (affiché tel quel).
export default function ChangePasswordSection() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [currentError, setCurrentError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

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
        setSuccessMessage("");
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
            setSuccessMessage("Mot de passe modifié. Un e-mail de confirmation vous a été envoyé.");
            setCurrent("");
            setNext("");
            setConfirm("");
            setSubmitted(false);
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
        <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-line pb-3">
                <h2 className="text-lg font-semibold text-primary">Mot de passe</h2>
                <p className="text-sm text-muted">Choisissez un mot de passe que vous n&apos;utilisez nulle part ailleurs.</p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-md">
                <SuccessMessage message={successMessage} />
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

                <Button type="submit" fullWidth={false} loading={saving}>
                    Changer mon mot de passe
                </Button>
            </form>
        </section>
    );
}
