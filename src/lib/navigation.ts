import { Role } from "@/types/api";

// L'adresse de la page d'accueil de chaque rôle.
// Écrite ici une seule fois : tout le reste de l'application l'utilise.
export function getHomePath(role: Role): string {
    if (role === "PROFESSIONAL") {
        return "/pro/profile";
    }
    return "/services";
}