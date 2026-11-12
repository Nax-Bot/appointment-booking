"use client";

import { SubmitEvent, useState } from "react";
import Link from "next/link";
import { useSession } from "@/context/session-context";
import { ApiError } from "@/lib/lib-front/api-client";
import { isEmailValid } from "@/lib/form-validation";
import { Role, RegisterInput } from "@/types/api";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function RegisterPage() {
    const { register } = useSession();

    const [role, setRole] = useState<Role>("CLIENT");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");

    const [isDisplay, setIsDisplay] = useState(false);

    // "touched" = la personne a déjà quitté le champ : on peut alors afficher son erreur
    const [firstNameTouched, setFirstNameTouched] = useState(false);
    const [lastNameTouched, setLastNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    
    // submitted = la personne a déjà cliqué sur le bouton : on affiche toutes les erreurs
    const [submitted, setSubmitted] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Une fonction par champ : elle renvoie le message d'erreur, ou "" si tout va bien
    // (mêmes limites que le backend : prénom et nom obligatoires, mot de passe 8 caractères minimum)
    function getFirstNameError(): string {
        if (firstName.trim() === "") {
            return "Le prénom est obligatoire";
        }
        return "";
    }

    function getLastNameError(): string {
        if (lastName.trim() === "") {
            return "Le nom est obligatoire";
        }
        return "";
    }

    function getEmailError(): string {
        if (email.trim() === "") {
            return "L'adresse e-mail est obligatoire";
        }
        if (isEmailValid(email) === false) {
            return "Adresse e-mail invalide.";
        }
        return "";
    }

    function getPasswordError(): string {
        if (password.length < 8) {
            return "Le mot de passe doit contenir au moins 8 caractères";
        }
        return "";
    }

    // On n'affiche l'erreur qu'après avoir quitté le champ, ou après un clic sur le bouton
    let firstNameError = "";
    if (firstNameTouched || submitted) {
        firstNameError = getFirstNameError();
    }
    let lastNameError = "";
    if (lastNameTouched || submitted) {
        lastNameError = getLastNameError();
    }
    let emailError = "";
    if (emailTouched || submitted) {
        emailError = getEmailError();
    }
    let passwordError = "";
    if (passwordTouched || submitted) {
        passwordError = getPasswordError();
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setSubmitted(true);

        // S'il reste une erreur de saisie, on n'envoie rien au backend
        const hasFormError =
            getFirstNameError() !== "" ||
            getLastNameError() !== "" ||
            getEmailError() !== "" ||
            getPasswordError() !== "";
        if (hasFormError) {
            return;
        }

        setSubmitting(true);

        const data: RegisterInput = {
            role: role,
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
        };
        // Le téléphone est facultatif : on l'envoie seulement s'il est rempli
        if (phoneNumber.trim() !== "") {
            data.phoneNumber = phoneNumber;
        }

        try {
            await register(data);
            // Succès : le layout (auth) voit l'utilisateur et redirige vers "/"
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
                setIsDisplay(true);
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSubmitting(false);
    }

    return (
        // noValidate : c'est notre code qui valide, pas les bulles du navigateur
        <form onSubmit={handleSubmit} noValidate>
            <h1 className="mb-6 text-2xl font-bold text-ink">Créer votre compte</h1>

            <ErrorMessage message={errorMessage} details={errorDetails} isDisplay={isDisplay} />

            <Select
                label="Je suis"
                value={role}
                onChange={(value) => setRole(value as Role)}
                options={[
                    { value: "CLIENT", label: "Un client" },
                    { value: "PROFESSIONAL", label: "Un professionnel" },
                ]}
            />

            {/* Prénom et nom côte à côte */}
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Prénom"
                    placeholder="Christian"
                    value={firstName}
                    onChange={setFirstName}
                    onBlur={() => setFirstNameTouched(true)}
                    error={firstNameError}
                />
                <Input
                    label="Nom"
                    placeholder="Randria"
                    value={lastName}
                    onChange={setLastName}
                    onBlur={() => setLastNameTouched(true)}
                    error={lastNameError}
                />
            </div>

            <Input
                label="Adresse e-mail"
                type="email"
                value={email}
                onChange={setEmail}
                onBlur={() => setEmailTouched(true)}
                error={emailError}
            />

            <Input label="Téléphone (facultatif)" value={phoneNumber} onChange={setPhoneNumber} />

            <PasswordInput
                label="Mot de passe"
                value={password}
                onChange={setPassword}
                onBlur={() => setPasswordTouched(true)}
                error={passwordError}
                showStrength={true}
            />

            <Button type="submit" loading={submitting}>
                {submitting ? "Inscription..." : "Créer mon compte"}
            </Button>

            <p className="mt-4 text-center text-sm text-ink">
                Déjà un compte ?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline" >
                    Se connecter
                </Link>
            </p>
        </form>
    );
}