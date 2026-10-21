import { z } from "zod";

// Un identifiant dans l'URL arrive toujours sous forme de texte : on vérifie que c'est un entier positif
export const idParamSchema = z
    .string()
    .regex(/^[1-9][0-9]*$/, "L'identifiant doit être un entier positif");