// Le secret qui sert à signer les sessions (JWT) et à calculer l'empreinte des codes de vérification.
// Un secret trop court se devine : en production on exige au moins 32 caractères.
const MIN_SECRET_LENGTH = 32;

let warned = false;

export function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET est manquant dans le fichier .env");
    }

    if (secret.length < MIN_SECRET_LENGTH) {
        const message = "AUTH_SECRET est trop court (" + secret.length + " caractères) : " + MIN_SECRET_LENGTH + " minimum.";

        // En production on refuse de démarrer avec un secret faible ; en développement on prévient seulement
        if (process.env.NODE_ENV === "production") {
            throw new Error(message);
        }
        if (warned === false) {
            console.warn("[SÉCURITÉ] " + message + " Générez-en un avec : openssl rand -base64 48");
            warned = true;
        }
    }

    return secret;
}
