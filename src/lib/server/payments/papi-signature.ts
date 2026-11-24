import { createHmac, timingSafeEqual } from "crypto";

// Vérifie qu'une notification vient bien de Papi.
//
// Papi envoie l'en-tête  X-Papi-Signature: t=<secondes>,v1=<signature>
// La signature est un HMAC-SHA256 (en hexadécimal) calculé sur  t + "." + corps_brut,
// avec comme clé le secret COMPLET (y compris le préfixe "pwhsec_").
//
// - rawBody : le corps EXACT reçu (texte), jamais re-sérialisé après un JSON.parse
// - toleranceSeconds : écart maximum accepté avec l'heure actuelle (300 s chez Papi) ;
//   0 désactive ce contrôle (uniquement pour tester avec un vecteur d'exemple)
export function verifyPapiSignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string,
    toleranceSeconds: number = 300,
    nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
    if (signatureHeader === null || secret === "") {
        return false;
    }

    // On lit "t=...,v1=..." sans dépendre de l'ordre
    let t = "";
    let v1 = "";
    for (const part of signatureHeader.split(",")) {
        const piece = part.trim();
        if (piece.startsWith("t=")) {
            t = piece.slice(2);
        } else if (piece.startsWith("v1=")) {
            v1 = piece.slice(3);
        }
    }

    // t : que des chiffres. v1 : exactement 64 caractères hexadécimaux en minuscules.
    if (/^\d+$/.test(t) === false || /^[0-9a-f]{64}$/.test(v1) === false) {
        return false;
    }

    // Une notification trop ancienne (ou rejouée plus tard) est refusée
    if (toleranceSeconds > 0 && Math.abs(nowSeconds - Number(t)) > toleranceSeconds) {
        return false;
    }

    const expected = createHmac("sha256", secret).update(t + ".").update(rawBody).digest();
    const received = Buffer.from(v1, "hex");

    // Comparaison en temps constant (évite de deviner la signature par le temps de réponse)
    return timingSafeEqual(expected, received);
}
