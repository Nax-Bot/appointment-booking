import { z } from "zod";

// Données pour créer un service : le nom, une description facultative,
// et la durée et le prix du professionnel qui le crée
export const createServiceSchema = z.object({
    name: z
        .string({ message: "Le nom est obligatoire" })
        .trim()
        .min(2, "Le nom doit contenir au moins 2 caractères")
        .max(150, "Le nom est trop long (150 caractères maximum)"),
    description: z
        .string()
        .trim()
        .min(1, "La description ne peut pas être vide (omettez-la ou envoyez null)")
        .max(2000, "La description est trop longue (2000 caractères maximum)")
        .nullable()
        .optional(),
    duration: z
        .number({ message: "La durée est obligatoire et doit être un nombre" })
        .int("La durée doit être un nombre entier de minutes")
        .min(1, "La durée doit être d'au moins 1 minute")
        .max(1440, "La durée ne peut pas dépasser 1440 minutes (24 heures)"),
    price: z
        .number({ message: "Le prix est obligatoire et doit être un nombre" })
        .positive("Le prix doit être supérieur à 0")
        .max(99999999.99, "Le prix est trop élevé"),
});

// Paramètre de l'URL : /api/services/suggestions?name=consult
export const suggestionsQuerySchema = z.object({
    name: z
        .string({ message: "Le nom à rechercher est obligatoire" })
        .trim()
        .min(2, "Tapez au moins 2 caractères")
        .max(150, "Le nom à rechercher est trop long (150 caractères maximum)"),
});