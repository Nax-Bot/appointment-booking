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

// Un professionnel tel que le backend le renvoie (GET /api/professionals/[id])
export interface Professional {
  userId: number;
  firstName: string;
  lastName: string;
  specialty: string | null;
  description: string | null;
}

// Les données envoyées pour modifier son profil (PATCH /api/professionals/me)
// null = effacer la valeur
export interface UpdateProfileInput {
  specialty: string | null;
  description: string | null;
}

// Un service proposé par un professionnel (une « offre »).
// price et duration sont les valeurs effectives : celles du professionnel.
export interface Offer {
  serviceId: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  customPrice: number | null;
  customDuration: number | null;
}

// Une suggestion du catalogue (GET /api/services/suggestions).
// price et duration sont seulement indicatifs. exact = le nom est identique à la recherche.
export interface ServiceSuggestion {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  exact: boolean;
}

// Proposer un service existant, ou modifier son prix et sa durée (PUT)
export interface SetOfferInput {
  customPrice: number;
  customDuration: number;
}

// Créer un nouveau service (POST /api/services)
export interface CreateServiceInput {
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

// Une plage horaire récurrente : « tous les lundis de 08:00 à 12:00 ».
// dayOfWeek : 0 = dimanche, 1 = lundi ... 6 = samedi.
// Heures en "HH:mm" (heure locale), dates en "AAAA-MM-JJ", null = sans limite.
export interface Availability {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom: string | null;
  validTo: string | null;
}

// Les données envoyées pour créer ou remplacer une plage (POST et PUT)
export interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom: string | null;
  validTo: string | null;
}

// Une absence ponctuelle (congé, formation).
// Contrairement aux horaires, ce sont de vrais instants : le backend les renvoie en UTC,
// au format ISO (par exemple "2026-11-15T21:00:00.000Z").
export interface Unavailability {
  id: number;
  startDatetime: string;
  endDatetime: string;
  reason: string | null;
}

// Les données envoyées pour créer ou remplacer une absence (POST et PUT).
// Les dates doivent être au format ISO 8601 avec fuseau.
export interface UnavailabilityInput {
  startDatetime: string;
  endDatetime: string;
  reason: string | null;
}