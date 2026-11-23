import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Chiffre / déchiffre les secrets stockés en base (clés API des boutiques Papi).
// Algorithme : AES-256-GCM (chiffre ET détecte toute modification).
// La clé vient de .env : PAYMENT_ENCRYPTION_KEY = 64 caractères hexadécimaux (32 octets).
// Pour en générer une :  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// ATTENTION : si cette clé est perdue ou changée, les clés déjà stockées deviennent illisibles.

function readKey(): Buffer {
    const hex = process.env.PAYMENT_ENCRYPTION_KEY ?? "";
    if (/^[0-9a-fA-F]{64}$/.test(hex) === false) {
        throw new Error("PAYMENT_ENCRYPTION_KEY doit contenir exactement 64 caractères hexadécimaux");
    }
    return Buffer.from(hex, "hex");
}

// Résultat : "v1:<iv>:<tag>:<données>" (tout en base64)
export function encryptSecret(plainText: string): string {
    const key = readKey();
    const iv = randomBytes(12); // un iv NEUF à chaque chiffrement
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return "v1:" + iv.toString("base64") + ":" + tag.toString("base64") + ":" + data.toString("base64");
}

export function decryptSecret(stored: string): string {
    const key = readKey();
    const parts = stored.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
        throw new Error("Secret stocké dans un format inconnu");
    }
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64"));
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    const data = Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]);
    return data.toString("utf8");
}
