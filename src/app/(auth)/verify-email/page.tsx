"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useSession } from "@/context/session-context";
import { ApiError } from "@/lib/client/api-client";
import CodeInput, { CODE_LENGTH } from "@/components/auth/CodeInput";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";

// Même délai que le backend : pas de nouveau code avant 60 secondes
const RESEND_DELAY_SECONDS = 60;
// Le code reste valable 10 minutes (information affichée à la personne)
const CODE_LIFETIME_MINUTES = 10;

function emptyDigits(): string[] {
    return new Array<string>(CODE_LENGTH).fill("");
}

export default function VerifyEmailPage() {
    // useSearchParams doit être dans un composant sous <Suspense>
    return (
        <Suspense fallback={null}>
            <VerifyEmailForm />
        </Suspense>
    );
}

function VerifyEmailForm() {
    const { verifyEmail, resendCode } = useSession();
    const router = useRouter();
    const params = useSearchParams();

    const email = (params.get("email") ?? "").trim().toLowerCase();
    // On arrive de la connexion : le code d'origine est peut-être perdu, on en envoie un nouveau
    const comesFromLogin = params.get("from") === "login";

    const [digits, setDigits] = useState<string[]>(emptyDigits());
    const [focusSignal, setFocusSignal] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [locked, setLocked] = useState(false); // trop d'essais : il faut un nouveau code
    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [cooldown, setCooldown] = useState(RESEND_DELAY_SECONDS);

    const rowRef = useRef<HTMLDivElement>(null);
    const autoSentRef = useRef(false);

    // Pas d'adresse dans le lien : on ne sait pas qui vérifier
    useEffect(() => {
        if (email === "") {
            router.replace("/login");
        }
    }, [email, router]);

    // Le compte à rebours du bouton « Renvoyer le code »
    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }
        const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // Venant de la connexion : on demande tout de suite un nouveau code (une seule fois)
    useEffect(() => {
        if (comesFromLogin === false || email === "" || autoSentRef.current) {
            return;
        }
        autoSentRef.current = true;
        resendCode(email)
            .then(() => setInfoMessage("Votre e-mail n'est pas encore vérifié : un nouveau code vient d'être envoyé."))
            .catch(() => setInfoMessage(""));
    }, [comesFromLogin, email, resendCode]);

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

    async function submit(code: string) {
        if (submitting || locked) {
            return;
        }
        setSubmitting(true);
        setErrorMessage("");
        setInfoMessage("");

        try {
            await verifyEmail(email, code);
            // Succès : le layout (auth) voit l'utilisateur et redirige vers "/"
            return;
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.statusCode === 429) {
                    setLocked(true);
                }
                setErrorMessage(
                    error.statusCode === 400
                        ? "Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau."
                        : error.message
                );
            } else {
                setErrorMessage("Erreur inattendue");
            }
            shake();
            setDigits(emptyDigits());
            setFocusSignal((value) => value + 1);
        }
        setSubmitting(false);
    }

    function handleDigitsChange(next: string[]) {
        setDigits(next);
        setErrorMessage("");
        const code = next.join("");
        // Dès que les 6 chiffres sont là, on vérifie tout seul
        if (code.length === CODE_LENGTH) {
            submit(code);
        } else {
        }
    }

    async function handleResend() {
        if (cooldown > 0 || resending) {
            return;
        }
        setResending(true);
        setErrorMessage("");
        setInfoMessage("");
        try {
            await resendCode(email);
            setInfoMessage("Un nouveau code vient d'être envoyé à " + email + ".");
            setLocked(false);
            setDigits(emptyDigits());
            setFocusSignal((value) => value + 1);
            setCooldown(RESEND_DELAY_SECONDS);
        } catch (error) {
            setErrorMessage(error instanceof ApiError ? error.message : "Erreur inattendue");
        }
        setResending(false);
    }

    if (email === "") {
        return null;
    }

    const code = digits.join("");
    const complete = code.length === CODE_LENGTH;

    return (
        <div>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-primary ring-8 ring-tint/50">
                <MailCheck className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold text-ink">Vérifiez votre e-mail</h1>
            <p className="mt-2 mb-6 text-sm leading-relaxed text-muted">
                {comesFromLogin ? "Entrez le code à 6 chiffres envoyé à " : "Nous avons envoyé un code à 6 chiffres à "}
                <span className="font-semibold [overflow-wrap:anywhere] text-ink">{email}</span>. Il est valable{" "}
                {CODE_LIFETIME_MINUTES} minutes.
            </p>

            <SuccessMessage message={infoMessage} />
            <ErrorMessage message={errorMessage} />

            <div ref={rowRef} className="mb-6">
                <CodeInput
                    digits={digits}
                    onChange={handleDigitsChange}
                    disabled={submitting || locked}
                    hasError={errorMessage !== ""}
                    focusSignal={focusSignal}
                />
            </div>

            <Button
                loading={submitting}
                disabled={complete === false || locked}
                onClick={() => submit(code)}
            >
                {submitting ? "Vérification..." : "Vérifier mon e-mail"}
            </Button>

            <div className="mt-5 text-center text-sm text-ink">
                <p className="text-muted">Vous n&apos;avez rien reçu ? Regardez aussi dans vos courriers indésirables.</p>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || resending}
                    className="mt-2 font-medium text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                >
                    {resending
                        ? "Envoi..."
                        : cooldown > 0
                          ? "Renvoyer le code dans " + cooldown + " s"
                          : "Renvoyer le code"}
                </button>
            </div>

            <p className="mt-6 flex flex-col items-center gap-2 border-t border-line pt-4 text-sm sm:flex-row sm:justify-center sm:gap-4">
                <Link href="/register" className="text-muted hover:text-ink hover:underline">
                    Changer d&apos;adresse e-mail
                </Link>
                <Link href="/login" className="text-muted hover:text-ink hover:underline">
                    Retour à la connexion
                </Link>
            </p>
        </div>
    );
}
