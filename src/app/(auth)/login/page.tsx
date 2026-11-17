"use client";

import { SubmitEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/session-context";
import { ApiError } from "@/lib/lib-front/api-client";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function LoginPage() {
    const { login } = useSession();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [isDisplay, setIsDisplay] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        // Empêche le navigateur de recharger la page
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setSubmitting(true);

        try {
            await login(email, password);
            // Succès : le layout (auth) voit l'utilisateur et redirige vers "/"
        } catch (error) {
            // Mot de passe juste mais e-mail pas encore vérifié : on envoie la personne saisir son code
            if (
                error instanceof ApiError &&
                error.statusCode === 403 &&
                error.details.some((detail) => detail.includes("EMAIL_NOT_VERIFIED"))
            ) {
                router.push("/verify-email?from=login&email=" + encodeURIComponent(email.trim().toLowerCase()));
                return;
            }
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
                setIsDisplay(true)
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSubmitting(false);
    }

    return (
        <form onSubmit={handleSubmit}>
            <h1 className="mb-6 text-2xl font-bold text-ink">Connexion</h1>

            <ErrorMessage message={errorMessage} details={errorDetails} isDisplay={isDisplay}/>

            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <PasswordInput label="Mot de passe" value={password} onChange={setPassword} />

            <Button type="submit" loading={submitting}>
                {submitting ? "Connexion..." : "Se connecter"}
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