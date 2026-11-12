import { z } from "zod";

// Données pour réserver un rendez-vous.
// La date de début doit être au format ISO 8601 AVEC fuseau horaire.
export const createAppointmentSchema = z.object({
  professionalId: z
    .number({ message: "L'identifiant du professionnel doit être un nombre" })
    .int("L'identifiant du professionnel doit être un nombre entier")
    .positive("L'identifiant du professionnel doit être positif"),
  serviceId: z
    .number({ message: "L'identifiant du service doit être un nombre" })
    .int("L'identifiant du service doit être un nombre entier")
    .positive("L'identifiant du service doit être positif"),
  startDatetime: z
    .string({ message: "La date de début est obligatoire" })
    .datetime({
      offset: true,
      message: "La date de début doit être au format ISO 8601 avec fuseau (ex. 2026-11-09T09:00:00+03:00)",
    }),
  notes: z
    .string()
    .trim()
    .min(1, "Les notes ne peuvent pas être vides (omettez-les ou envoyez null)")
    .max(2000, "Les notes sont trop longues (2000 caractères maximum)")
    .nullable()
    .optional(),
});

// Données pour qu'un professionnel ajoute un rendez-vous à la main,
// pour un client qui n'a pas de compte (un "invité")
export const createManualAppointmentSchema = z.object({
  serviceId: z
    .number({ message: "L'identifiant du service doit être un nombre" })
    .int("L'identifiant du service doit être un nombre entier")
    .positive("L'identifiant du service doit être positif"),
  startDatetime: z
    .string({ message: "La date de début est obligatoire" })
    .datetime({
      offset: true,
      message: "La date de début doit être au format ISO 8601 avec fuseau (ex. 2026-11-09T09:00:00+03:00)",
    }),
  guestName: z
    .string({ message: "Le nom du client est obligatoire" })
    .trim()
    .min(2, "Le nom du client doit contenir au moins 2 caractères")
    .max(150, "Le nom du client est trop long (150 caractères maximum)"),
  guestPhone: z
    .string()
    .trim()
    .min(1, "Le téléphone ne peut pas être vide (omettez-le ou envoyez null)")
    .max(30, "Le téléphone est trop long (30 caractères maximum)")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .min(1, "Les notes ne peuvent pas être vides (omettez-les ou envoyez null)")
    .max(2000, "Les notes sont trop longues (2000 caractères maximum)")
    .nullable()
    .optional(),
});

// Paramètres acceptés pour lister ses rendez-vous : /api/appointments?status=PENDING
export const listAppointmentsQuerySchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"], {
      message: "Le statut doit être PENDING, CONFIRMED, CANCELLED, COMPLETED ou NO_SHOW",
    })
    .optional(),
});

// Données pour annuler un rendez-vous : la raison est facultative
export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "La raison ne peut pas être vide (omettez-la ou envoyez null)")
    .max(255, "La raison est trop longue (255 caractères maximum)")
    .nullable()
    .optional(),
});