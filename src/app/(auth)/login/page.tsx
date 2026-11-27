"use client";

import { Suspense, SubmitEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/context/session-context";
import { ApiError } from "@/lib/client/api-client";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import AuthHeading from "@/components/auth/AuthHeading";

// Un blocage de connexion (réponse 429 du serveur) : pour quel email, jusqu'à quand (ms), et pour combien de secondes au départ.
// On le garde dans le navigateur pour que le compte à rebours survive à un rechargement de la page.
// Le vrai blocage reste côté serveur : ceci ne sert qu'à l'affichage.
interface LoginLock {
    email: string;
    until: number;
    totalSeconds: number;
}

const LOCK_STORAGE_KEY = "login-lock";

function readStoredLock(): LoginLock | null {
    try {
        const raw = window.localStorage.getItem(LOCK_STORAGE_KEY);
        if (raw === null) {
            return null;
        }
        const data = JSON.parse(raw) as Partial<LoginLock>;
        if (
            typeof data.email === "string" &&
            typeof data.until === "number" &&
            typeof data.totalSeconds === "number" &&
            data.until > Date.now()
        ) {
            return { email: data.email, until: data.until, totalSeconds: data.totalSeconds };
        }
    } catch {
        // Stockage indisponible ou contenu cassé : on fait comme s'il n'y avait rien
    }
    return null;
}

function writeStoredLock(lock: LoginLock | null) {
    try {
        if (lock === null) {
            window.localStorage.removeItem(LOCK_STORAGE_KEY);
        } else {
            window.localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(lock));
        }
    } catch {
        // Pas grave : le compte à rebours marche quand même sans stockage
    }
}

// 872 secondes -> « 14:32 » ; au-delà d'une heure -> « 1:02:03 »
function formatCountdown(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    if (hours > 0) {
        return hours + ":" + mm + ":" + ss;
    }
    return minutes + ":" + ss;
}

export default function LoginPage() {
    // useSearchParams doit être dans un composant sous <Suspense>
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    // On arrive après un « mot de passe oublié » réussi : petit message de confirmation
    const resetDone = useSearchParams().get("reset") === "1";
    const { login } = useSession();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [isDisplay, setIsDisplay] = useState(false);

    // Blocage en cours (s'il y en a un) et l'heure affichée, mise à jour chaque seconde pendant un blocage
    const [lock, setLock] = useState<LoginLock | null>(null);
    const [now, setNow] = useState(() => Date.now());

    // Au chargement : on reprend un blocage commencé avant un rechargement de la page
    useEffect(() => {
        const stored = readStoredLock();
        if (stored !== null) {
            setNow(Date.now());
            setLock(stored);
            setEmail(stored.email);
        }
    }, []);

    // Pendant un blocage : un tick par seconde, et on libère le formulaire quand le temps est écoulé
    useEffect(() => {
        if (lock === null) {
            return;
        }
        const timer = window.setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= lock.until) {
                setLock(null);
                writeStoredLock(null);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [lock]);

    const cleanEmail = email.trim().toLowerCase();
    const remainingSeconds = lock === null ? 0 : Math.max(0, Math.ceil((lock.until - now) / 1000));
    // Tant que le délai court, le formulaire reste bloqué, quoi qu'on tape dans les champs
    const isLocked = lock !== null && remainingSeconds > 0;

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        // Empêche le navigateur de recharger la page
        event.preventDefault();
        if (isLocked) {
            return;
        }
        // On garde l'ancienne erreur affichée pendant l'envoi : elle est remplacée à la réponse.
        // La vider ici puis la réafficher faisait « pomper » la page à chaque tentative.
        setSubmitting(true);

        try {
            await login(email, password);
            // Succès : le layout (auth) voit l'utilisateur et redirige vers "/"
            writeStoredLock(null);
            setErrorMessage("");
            setErrorDetails([]);
        } catch (error) {
            // Mot de passe juste mais e-mail pas encore vérifié : on envoie la personne saisir son code
            if (
                error instanceof ApiError &&
                error.statusCode === 403 &&
                error.details.some((detail) => detail.includes("EMAIL_NOT_VERIFIED"))
            ) {
                router.push("/verify-email?from=login&email=" + encodeURIComponent(cleanEmail));
                return;
            }
            // Trop de tentatives : on affiche un compte à rebours au lieu d'un simple message
            if (error instanceof ApiError && error.statusCode === 429 && error.retryAfterSeconds !== null) {
                const current = Date.now();
                const newLock: LoginLock = {
                    email: cleanEmail,
                    until: current + error.retryAfterSeconds * 1000,
                    totalSeconds: error.retryAfterSeconds,
                };
                setNow(current);
                setLock(newLock);
                writeStoredLock(newLock);
                setPassword("");
                setSubmitting(false);
                return;
            }
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
                setIsDisplay(true);
            } else {
                setErrorMessage("Erreur inattendue");
                setIsDisplay(true);
            }
        }

        setSubmitting(false);
    }

    return (
        <form onSubmit={handleSubmit}>
            <AuthHeading title="Content de vous revoir">Connectez-vous pour retrouver vos rendez-vous.</AuthHeading>

            <SuccessMessage message={resetDone ? "Mot de passe modifié. Vous pouvez vous connecter." : ""} />

            {isLocked ? (
                <ErrorMessage
                    tone="warning"
                    title="Connexion temporairement suspendue"
                    message="Trop de tentatives de connexion ont échoué. Pour protéger votre compte, l'accès est bloqué un moment."
                />
            ) : (
                <ErrorMessage message={errorMessage} details={errorDetails} isDisplay={isDisplay} />
            )}

            <Input label="Email" type="email" placeholder="Ex. rakoto@gmail.com" value={email} onChange={setEmail} />
            <PasswordInput label="Mot de passe" value={password} onChange={setPassword} />
            <p className="-mt-2 mb-4 text-right text-sm">
                <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                    Mot de passe oublié ?
                </Link>
            </p>

            <Button type="submit" loading={submitting} disabled={isLocked}>
                {isLocked ? "Réessayez dans " + formatCountdown(remainingSeconds) : submitting ? "Connexion..." : "Se connecter"}
            </Button>

            <p className="mt-4 text-center text-sm text-ink">
                Pas encore de compte ?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    S&apos;inscrire
                </Link>
            </p>
        </form>
    );
}
