import { z } from "zod";

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
    // bcrypt ne lit que les 72 premiers caractères, donc on limite à 72
    password: z
        .string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères")
        .max(72, "Le mot de passe est trop long (72 caractères maximum)"),
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
        .min(1, "L'email est obligatoire"),
    password: z.string().min(1, "Le mot de passe est obligatoire"),
});