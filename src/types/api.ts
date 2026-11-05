// Les deux rôles possibles (mêmes valeurs que dans le backend)
export type Role = "CLIENT" | "PROFESSIONAL";

// L'utilisateur renvoyé par /api/auth/login, /api/auth/register et /api/auth/me
export interface AuthUser {
  userId: number;
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
}

// Les données envoyées pour s'inscrire
export interface RegisterInput {
  role: Role;
  lastName: string;
  firstName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

// La forme d'une réponse d'erreur du backend
export interface ApiErrorBody {
  error: string;
  details: string[];
}