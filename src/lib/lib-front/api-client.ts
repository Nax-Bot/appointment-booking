import { ApiErrorBody } from "@/types/api";

// Erreur lancée quand l'API répond avec un code d'erreur (400, 401, 404, 409...)
// statusCode = 0 veut dire : le serveur n'a pas répondu du tout
export class ApiError extends Error {
    statusCode: number;
    details: string[];
    // Pour une erreur 429 : le nombre de secondes à attendre (en-tête Retry-After), sinon null
    retryAfterSeconds: number | null;

    constructor(message: string, statusCode: number, details: string[], retryAfterSeconds: number | null = null) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.details = details;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// La seule fonction qui fait un fetch dans tout le frontend.
// <T> = le type de ce qu'on s'attend à recevoir. On le précise à l'appel :
// apiGet<AuthUser>("/api/auth/me")
async function apiFetch<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
    const headers: { [key: string]: string } = {};
    const options: RequestInit = {
        method: method,
        headers: headers,
        cache: "no-store",
    };

    // On envoie un corps JSON seulement s'il y en a un
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    // Le fetch lui-même peut échouer (serveur arrêté, coupure réseau)
    let response: Response;
    try {
        response = await fetch(path, options);
    } catch {
        throw new ApiError("Impossible de joindre le serveur", 0, []);
    }

    // On lit le JSON. Si le corps est vide ou cassé, on garde null.
    let data: unknown = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    // Code 2xx : tout va bien, on renvoie les données
    if (response.ok === true) {
        return data as T;
    }

    // Sinon : on transforme { error, details } du backend en ApiError
    const errorBody = data as ApiErrorBody | null;
    let message = "Erreur inattendue";
    let details: string[] = [];

    if (errorBody !== null && typeof errorBody.error === "string") {
        message = errorBody.error;
    }
    if (errorBody !== null && Array.isArray(errorBody.details)) {
        details = errorBody.details;
    }

    // Une erreur 429 dit combien de temps attendre dans l'en-tête Retry-After (en secondes)
    let retryAfterSeconds: number | null = null;
    const retryHeader = Number(response.headers.get("Retry-After"));
    if (response.status === 429 && Number.isFinite(retryHeader) && retryHeader > 0) {
        retryAfterSeconds = Math.ceil(retryHeader);
    }

    throw new ApiError(message, response.status, details, retryAfterSeconds);
}

// Petits raccourcis : les pages utilisent ceux-là
export function apiGet<T>(path: string): Promise<T> {
    return apiFetch<T>(path, "GET");
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, "POST", body);
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, "PUT", body);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, "PATCH", body);
}

export function apiDelete<T>(path: string): Promise<T> {
    return apiFetch<T>(path, "DELETE");
}