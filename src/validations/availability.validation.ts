import { z } from "zod";

// Heure au format HH:mm (de 00:00 à 23:59)
const timePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

// Date au format AAAA-MM-JJ (années 1900 à 2099). On vérifie que la date existe vraiment dans le service.
const datePattern = /^(19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}$/;

// Données d'une disponibilité (même schéma pour créer et pour remplacer)
export const availabilitySchema = z.object({
  // 0 = dimanche, 1 = lundi ... 6 = samedi
  dayOfWeek: z
    .number({ message: "Le jour de la semaine doit être un nombre" })
    .int("Le jour de la semaine doit être un nombre entier")
    .min(0, "Le jour de la semaine va de 0 (dimanche) à 6 (samedi)")
    .max(6, "Le jour de la semaine va de 0 (dimanche) à 6 (samedi)"),
  startTime: z
    .string({ message: "L'heure de début est obligatoire" })
    .regex(timePattern, "L'heure de début doit être au format HH:mm (ex. 08:00)"),
  endTime: z
    .string({ message: "L'heure de fin est obligatoire" })
    .regex(timePattern, "L'heure de fin doit être au format HH:mm (ex. 12:00)"),
  // Début et fin de la période de validité (optionnelles : absentes = sans limite)
  validFrom: z
    .string()
    .regex(datePattern, "La date doit être au format AAAA-MM-JJ (ex. 2026-11-01)")
    .nullable()
    .optional(),
  validTo: z
    .string()
    .regex(datePattern, "La date doit être au format AAAA-MM-JJ (ex. 2026-11-30)")
    .nullable()
    .optional(),
});