import { z } from "zod";

// Les identifiants de la boutique Papi d'un professionnel
export const setupPaymentAccountSchema = z.object({
    boutiqueCode: z.string().trim().min(1, "Le code de la boutique est obligatoire").max(50),
    apiKey: z.string().trim().min(10, "Clé API invalide").max(500),
    // Le secret de signature Papi : "pwhsec_" suivi de 64 caractères hexadécimaux
    webhookSecret: z
        .string()
        .trim()
        .regex(/^pwhsec_[0-9a-f]{64}$/, "Le secret de signature doit ressembler à pwhsec_ suivi de 64 caractères"),
});
