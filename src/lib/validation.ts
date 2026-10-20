import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  email: z.string().trim().toLowerCase().email("Email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  phoneNumber: z.string().trim().max(30).optional(),
  role: z.enum(["CLIENT", "PROFESSIONAL"]),
  // Client
  birthDate: z.coerce.date().optional(),
  address: z.string().trim().max(255).optional(),
  // Professionnel
  specialty: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});