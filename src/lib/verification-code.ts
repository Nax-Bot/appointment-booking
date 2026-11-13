import { createHmac, randomInt, timingSafeEqual } from "crypto";

// Les réglages de la vérification d'email, rangés au même endroit
export const CODE_LIFETIME_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_DELAY_SECONDS = 60;
export const UNVERIFIED_ACCOUNT_LIFETIME_HOURS = 24;

// Tire un code à 6 chiffres au hasard (avec le générateur sûr de Node, pas Math.random)
export function generateCode(): string {
    const number = randomInt(0, 1000000);
    // padStart ajoute des zéros devant : 42 devient "000042"
    return String(number).padStart(6, "0");
}

// Lit le secret dans .env
function getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET est manquant dans le fichier .env");
    }
    return secret;
}

// Calcule l'empreinte d'un code. Le secret du serveur est mélangé au calcul :
// même si quelqu'un lisait la base, il ne pourrait pas retrouver les codes par essais.
export function hashCode(email: string, code: string): string {
    return createHmac("sha256", getSecret()).update(email + ":" + code).digest("hex");
}

// Compare deux empreintes en temps constant (le temps de la comparaison ne dépend pas de ce qui est juste)
export function codesMatch(hashA: string, hashB: string): boolean {
    const bufferA = Buffer.from(hashA, "hex");
    const bufferB = Buffer.from(hashB, "hex");

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return timingSafeEqual(bufferA, bufferB);
}