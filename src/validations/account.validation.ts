import { z } from "zod";
import { passwordSchema } from "@/validations/auth.validation";

const emailSchema = z.string().trim().toLowerCase().min(1, "L'email est obligatoire").max(255, "L'email est trop long");

// Demander un code de réinitialisation : seulement l'email
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

// Réinitialiser : email, code à 6 chiffres reçu par email, nouveau mot de passe
export const resetPasswordSchema = z.object({
    email: emailSchema,
    code: z
        .string({ message: "Le code est obligatoire" })
        .trim()
        .regex(/^[0-9]{6}$/, "Le code doit contenir 6 chiffres"),
    newPassword: passwordSchema,
});

// Changer son mot de passe quand on est connecté
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire"),
    newPassword: passwordSchema,
});

// Une date au format AAAA-MM-JJ qui existe vraiment, dans le passé, après 1900
function isValidBirthDate(text: string): boolean {
    const date = new Date(text + "T00:00:00.000Z");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
        return false;
    }
    return date.getTime() < Date.now() && date.getUTCFullYear() >= 1900;
}

// Modifier son profil : tous les champs sont facultatifs, mais il en faut au moins un.
// birthDate et address ne concernent que les clients (le service refuse sinon).
export const updateProfileSchema = z
    .object({
        firstName: z.string().trim().min(1, "Le prénom ne peut pas être vide").max(100, "Le prénom est trop long (100 caractères maximum)").optional(),
        lastName: z.string().trim().min(1, "Le nom ne peut pas être vide").max(100, "Le nom est trop long (100 caractères maximum)").optional(),
        phoneNumber: z.string().trim().min(1, "Le numéro ne peut pas être vide (envoyez null pour l'effacer)").max(30, "Le numéro de téléphone est trop long").nullable().optional(),
        birthDate: z
            .string()
            .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "La date doit être au format AAAA-MM-JJ")
            .refine(isValidBirthDate, "La date de naissance n'est pas valide")
            .nullable()
            .optional(),
        address: z.string().trim().min(1, "L'adresse ne peut pas être vide (envoyez null pour l'effacer)").max(255, "L'adresse est trop longue (255 caractères maximum)").nullable().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, "Aucune modification envoyée");
