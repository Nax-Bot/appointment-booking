"use client";

import { Suspense, SubmitEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, ApiError } from "@/lib/client/api-client";
import { getPasswordRuleError } from "@/lib/client/validation/form-validation";
import { RESET_CODE_LIFETIME_MINUTES, RESET_RESEND_DELAY_SECONDS } from "@/lib/client/account-rules";
import { MessageResult, ResetPasswordInput } from "@/types/account";
import CodeInput, { CODE_LENGTH } from "@/components/auth/CodeInput";
import AuthHeading from "@/components/auth/AuthHeading";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";

function emptyDigits(): string[] {
    return new Array<string>(CODE_LENGTH).fill("");
}

export default function ResetPasswordPage() {
    // useSearchParams doit être dans un composant sous <Suspense>
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}

// Étape 2 du mot de passe oublié : le code reçu par e-mail + le nouveau mot de passe.
function ResetPasswordForm() {
    const router = useRouter();
    const params = useSearchParams();
    const email = (params.get("email") ?? "").trim().toLowerCase();

    const [digits, setDigits] = useState<string[]>(emptyDigits());
    const [focusSignal, setFocusSignal] = useState(0);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [locked, setLocked] = useState(false); // trop d'essais : il faut un nouveau code
    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(RESET_RESEND_DELAY_SECONDS);
    const rowRef = useRef<HTMLDivElement>(null);

    // Pas d'adresse dans le lien : on ne sait pas quel compte réinitialiser
    useEffect(() => {
        if (email === "") {
            router.replace("/forgot-password");
        }
    }, [email, router]);

    // Compte à rebours avant de pouvoir redemander un code
    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }
        const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    const code = digits.join("");
    const codeComplete = code.length === CODE_LENGTH;
    const passwordError = password === "" ? "" : getPasswordRuleError(password);
    const confirmError = confirm !== "" && confirm !== password ? "Les deux mots de passe sont différents" : "";
    const formReady = codeComplete && password !== "" && passwordError === "" && confirm === password;

    // Petite secousse quand le code est faux
    function shake() {
        const row = rowRef.current;
        if (row === null || typeof row.animate !== "function") {
            return;
        }
        row.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(-8px)" },
                { transform: "translateX(8px)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(0)" },
            ],
            { duration: 360, easing: "ease-in-out" }
        );
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitted(true);
        if (formReady === false || locked) {
            return;
        }

        setErrorMessage("");
        setInfoMessage("");
        setSubmitting(true);
        const body: ResetPasswordInput = { email: email, code: code, newPassword: password };
        try {
            await apiPost<MessageResult>("/api/auth/reset-password", body);
            // Succès : retour à la connexion avec un message
            router.replace("/login?reset=1");
        } catch (error) {
            shake();
            if (error instanceof ApiError && error.statusCode === 429) {
                setLocked(true);
            }
            setErrorMessage(error instanceof ApiError ? error.message : "Erreur inattendue");
            setDigits(emptyDigits());
            setFocusSignal(focusSignal + 1);
            setSubmitting(false);
        }
    }

    async function handleResend() {
        setErrorMessage("");
        setInfoMessage("");
        setResending(true);
        try {
            await apiPost<MessageResult>("/api/auth/forgot-password", { email });
            setInfoMessage("Si un compte existe pour cette adresse, un nouveau code vient d'être envoyé.");
            setLocked(false);
            setDigits(emptyDigits());
            setFocusSignal(focusSignal + 1);
            setCooldown(RESET_RESEND_DELAY_SECONDS);
        } catch (error) {
            setErrorMessage(error instanceof ApiError ? error.message : "Erreur inattendue");
        }
        setResending(false);
    }

    if (email === "") {
        return null;
    }

    return (
        <form onSubmit={handleSubmit}>
            <AuthHeading title="Nouveau mot de passe">
                Entrez le code à 6 chiffres envoyé à{" "}
                <span className="font-semibold [overflow-wrap:anywhere] text-ink">{email}</span>. Il est valable{" "}
                {RESET_CODE_LIFETIME_MINUTES} minutes.
            </AuthHeading>

            <SuccessMessage message={infoMessage} />
            <ErrorMessage message={errorMessage} details={[]} />

            <div ref={rowRef} className="mb-6">
                <CodeInput
                    digits={digits}
                    onChange={setDigits}
                    disabled={submitting || locked}
                    hasError={errorMessage !== ""}
                    focusSignal={focusSignal}
                />
                {submitted && codeComplete === false && (
                    <p className="mt-2 text-xs text-red-600">Entrez les 6 chiffres du code</p>
                )}
            </div>

            <PasswordInput
                label="Nouveau mot de passe"
                value={password}
                onChange={setPassword}
                error={passwordError}
                showStrength={true}
            />
            <PasswordInput label="Confirmer le mot de passe" value={confirm} onChange={setConfirm} error={confirmError} />

            <Button type="submit" loading={submitting} disabled={locked}>
                {submitting ? "Enregistrement..." : "Changer mon mot de passe"}
            </Button>

            <p className="mt-5 flex flex-col items-center gap-2 border-t border-line pt-4 text-sm sm:flex-row sm:justify-center sm:gap-4">
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="font-medium text-primary hover:underline disabled:text-muted disabled:no-underline"
                >
                    {cooldown > 0 ? "Renvoyer le code dans " + cooldown + " s" : resending ? "Envoi..." : "Renvoyer le code"}
                </button>
                <Link href="/login" className="text-muted hover:text-ink hover:underline">
                    Retour à la connexion
                </Link>
            </p>
        </form>
    );
}
