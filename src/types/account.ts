import { Role } from "@/types/api";

// Le profil renvoyé après une modification (PATCH /api/users/me)
export interface Profile {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    role: Role;
    birthDate: string | null; // « AAAA-MM-JJ », clients seulement
    address: string | null; // clients seulement
    // Date (ISO) à partir de laquelle on pourra changer son nom ou prénom ; null = dès maintenant
    nameChangeAvailableAt: string | null;
}

// Les données envoyées pour modifier son profil. On n'envoie QUE ce qui change.
// null = effacer la valeur (téléphone, date de naissance, adresse)
export interface UpdateAccountInput {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
    birthDate?: string | null;
    address?: string | null;
}

// POST /api/users/me/password
export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

// POST /api/auth/forgot-password
export interface ForgotPasswordInput {
    email: string;
}

// POST /api/auth/reset-password
export interface ResetPasswordInput {
    email: string;
    code: string;
    newPassword: string;
}

// Réponse simple du backend : { message }
export interface MessageResult {
    message: string;
}
