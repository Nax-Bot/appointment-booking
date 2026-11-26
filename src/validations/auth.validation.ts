import { z } from "zod";

// Règle du mot de passe à l'inscription
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

// Une majuscule existe si le texte change quand on le passe en minuscules
function hasUppercase(text: string): boolean {
    return text !== text.toLowerCase();
}

// Une minuscule existe si le texte change quand on le passe en majuscules
function hasLowercase(text: string): boolean {
    return text !== text.toUpperCase();
}

function hasDigit(text: string): boolean {
    return /[0-9]/.test(text);
}

// bcrypt coupe le mot de passe à 72 octets : on refuse plus long, sinon la fin serait ignorée
function fitsInBcrypt(text: string): boolean {
    const bytes = new TextEncoder().encode(text).length;
    return bytes <= PASSWORD_MAX_BYTES;
}

// Règle du mot de passe : 8 caractères minimum, avec une majuscule, une minuscule et un chiffre.
// bcrypt ne lit que les 72 premiers OCTETS (pas caractères) : un "é" ou un emoji prend plusieurs octets.
// Réutilisée pour l'inscription, la réinitialisation et le changement de mot de passe.
export const passwordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH, "Le mot de passe doit contenir au moins " + PASSWORD_MIN_LENGTH + " caractères")
    .refine(hasUppercase, "Le mot de passe doit contenir au moins une majuscule")
    .refine(hasLowercase, "Le mot de passe doit contenir au moins une minuscule")
    .refine(hasDigit, "Le mot de passe doit contenir au moins un chiffre")
    .refine(fitsInBcrypt, "Le mot de passe est trop long (" + PASSWORD_MAX_BYTES + " octets maximum)");

// Données attendues pour créer un compte
export const registerSchema = z.object({
    // Le rôle choisi à l'inscription
    role: z.enum(["CLIENT", "PROFESSIONAL"], {
        message: "Le rôle doit être CLIENT ou PROFESSIONAL",
    }),
    lastName: z
        .string()
        .trim()
        .min(1, "Le nom est obligatoire")
        .max(100, "Le nom est trop long (100 caractères maximum)"),
    firstName: z
        .string()
        .trim()
        .min(1, "Le prénom est obligatoire")
        .max(100, "Le prénom est trop long (100 caractères maximum)"),
    // L'email est nettoyé (espaces retirés, minuscules) puis vérifié
    email: z
        .string()
        .trim()
        .toLowerCase()
        .max(255, "L'email est trop long")
        .email("L'email n'est pas valide"),
    // Règle du mot de passe : voir passwordSchema
    password: passwordSchema,
    phoneNumber: z
        .string()
        .trim()
        .max(30, "Le numéro de téléphone est trop long")
        .optional(),
});

// Données attendues pour se connecter
export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, "L'email est obligatoire")
        .max(255, "L'email est trop long"),
    password: z.string().min(1, "Le mot de passe est obligatoire"),
});

// Données attendues pour vérifier un email : l'email et le code à 6 chiffres
export const verifyEmailSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, "L'email est obligatoire"),
    code: z
        .string({ message: "Le code est obligatoire" })
        .trim()
        .regex(/^[0-9]{6}$/, "Le code doit contenir 6 chiffres"),
});

// Données attendues pour demander un nouveau code : seulement l'email
export const resendCodeSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, "L'email est obligatoire"),
});