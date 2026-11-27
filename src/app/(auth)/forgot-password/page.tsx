"use client";

import { SubmitEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiPost, ApiError } from "@/lib/client/api-client";
import { isEmailValid } from "@/lib/client/validation/form-validation";
import { ForgotPasswordInput, MessageResult } from "@/types/account";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import AuthHeading from "@/components/auth/AuthHeading";

// Étape 1 du mot de passe oublié : on saisit son adresse e-mail.
// Le backend répond TOUJOURS pareil (compte existant ou non) : on ne dit donc jamais
// « cette adresse n'existe pas », et on passe à l'étape du code dans tous les cas.
export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const cleanEmail = email.trim().toLowerCase();
    let emailError = "";
    if (touched && cleanEmail === "") {
        emailError = "L'adresse e-mail est obligatoire";
    } else if (touched && isEmailValid(cleanEmail) === false) {
        emailError = "L'adresse e-mail n'est pas valide";
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setTouched(true);
        if (cleanEmail === "" || isEmailValid(cleanEmail) === false) {
            return;
        }

        setSubmitting(true);
        const body: ForgotPasswordInput = { email: cleanEmail };
        try {
            await apiPost<MessageResult>("/api/auth/forgot-password", body);
            router.push("/reset-password?email=" + encodeURIComponent(cleanEmail));
        } catch (error) {
            // Seule vraie erreur possible : trop de demandes (429)
            setErrorMessage(error instanceof ApiError ? error.message : "Erreur inattendue");
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <AuthHeading title="Mot de passe oublié ?">
                Entrez l&apos;adresse e-mail de votre compte : nous vous enverrons un code à 6 chiffres pour choisir un
                nouveau mot de passe.
            </AuthHeading>

            <ErrorMessage message={errorMessage} details={[]} />

            <Input
                label="Email"
                type="email"
                placeholder="Ex. rakoto@gmail.com"
                value={email}
                onChange={setEmail}
                onBlur={() => setTouched(true)}
                error={emailError}
            />

            <Button type="submit" loading={submitting}>
                {submitting ? "Envoi..." : "Recevoir le code"}
            </Button>

            <p className="mt-5 text-center text-sm">
                <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la connexion
                </Link>
            </p>
        </form>
    );
}
