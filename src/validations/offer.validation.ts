import { z } from "zod";

// Données pour proposer un service avec SA durée et SON prix.
// Les deux champs sont obligatoires : chaque professionnel fixe ses propres valeurs.
export const setOfferSchema = z.object({
    customPrice: z
        .number({ message: "Le prix est obligatoire et doit être un nombre" })
        .positive("Le prix doit être supérieur à 0")
        .max(99999999.99, "Le prix est trop élevé"),
    customDuration: z
        .number({ message: "La durée est obligatoire et doit être un nombre" })
        .int("La durée doit être un nombre entier de minutes")
        .min(1, "La durée doit être d'au moins 1 minute")
        .max(1440, "La durée ne peut pas dépasser 1440 minutes (24 heures)"),
});