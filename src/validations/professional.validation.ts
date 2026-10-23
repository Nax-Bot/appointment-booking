import { z } from "zod";

// Données acceptées pour modifier son profil de professionnel.
// Chaque champ est optionnel. "null" sert à effacer la valeur.
export const updateProfessionalSchema = z.object({
    description: z
        .string()
        .trim()
        .min(1, "La description ne peut pas être vide (envoyez null pour l'effacer)")
        .max(2000, "La description est trop longue (2000 caractères maximum)")
        .nullable()
        .optional(),
    specialty: z
        .string()
        .trim()
        .min(1, "La spécialité ne peut pas être vide (envoyez null pour l'effacer)")
        .max(150, "La spécialité est trop longue (150 caractères maximum)")
        .nullable()
        .optional(),
});

// Paramètres de l'URL pour chercher des professionnels :
// /api/professionals?search=tojo&serviceId=3 (les deux sont facultatifs).
// Dans une URL, tout arrive sous forme de texte.
export const professionalsQuerySchema = z.object({
    search: z
        .string()
        .trim()
        .max(150, "La recherche est trop longue (150 caractères maximum)")
        .optional(),
    serviceId: z
        .string()
        .regex(/^[1-9][0-9]*$/, "L'identifiant du service doit être un entier positif")
        .optional(),
});