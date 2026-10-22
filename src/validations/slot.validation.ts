import { z } from "zod";

// Paramètres de l'URL : /api/professionals/[id]/slots?serviceId=3&date=2026-11-09
// Dans une URL, tout arrive sous forme de texte : on vérifie le format ici,
// et l'existence de la date est vérifiée dans le service.
export const slotsQuerySchema = z.object({
    serviceId: z
        .string({ message: "L'identifiant du service est obligatoire" })
        .regex(/^[1-9][0-9]*$/, "L'identifiant du service doit être un entier positif"),
    date: z
        .string({ message: "La date est obligatoire" })
        .regex(/^(19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}$/, "La date doit être au format AAAA-MM-JJ (ex. 2026-11-09)"),
});