import { z } from "zod";

// Données acceptées pour proposer un service avec un prix et une durée personnalisés.
// Les deux champs sont optionnels : absent ou null = on utilise les valeurs du catalogue.
export const setOfferSchema = z.object({
    customPrice: z
        .number({ message: "Le prix doit être un nombre" })
        .positive("Le prix doit être supérieur à 0")
        .max(99999999.99, "Le prix est trop élevé")
        .nullable()
        .optional(),
    customDuration: z
        .number({ message: "La durée doit être un nombre" })
        .int("La durée doit être un nombre entier de minutes")
        .min(1, "La durée doit être d'au moins 1 minute")
        .max(1440, "La durée ne peut pas dépasser 1440 minutes (24 heures)")
        .nullable()
        .optional(),
});