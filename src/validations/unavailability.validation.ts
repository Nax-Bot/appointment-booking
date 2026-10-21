import { z } from "zod";

// Données d'une indisponibilité (même schéma pour créer et pour remplacer).
// Les dates doivent être au format ISO 8601 AVEC fuseau horaire.
export const unavailabilitySchema = z.object({
    startDatetime: z
        .string({ message: "La date de début est obligatoire" })
        .datetime({
            offset: true,
            message: "La date de début doit être au format ISO 8601 avec fuseau (ex. 2026-11-10T08:00:00+03:00)",
        }),
    endDatetime: z
        .string({ message: "La date de fin est obligatoire" })
        .datetime({
            offset: true,
            message: "La date de fin doit être au format ISO 8601 avec fuseau (ex. 2026-11-10T18:00:00+03:00)",
        }),
    reason: z
        .string()
        .trim()
        .min(1, "La raison ne peut pas être vide (omettez-la ou envoyez null)")
        .max(255, "La raison est trop longue (255 caractères maximum)")
        .nullable()
        .optional(),
});