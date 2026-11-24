// Les réglages pour se connecter au serveur d'envoi d'emails (SMTP)
export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
}

// Les variables d'environnement : un dictionnaire dont les valeurs peuvent manquer
type EnvVariables = Record<string, string | undefined>;

// Lit une variable : texte sans espaces autour, ou "" si elle manque
function getValue(env: EnvVariables, name: string): string {
    const value = env[name];

    if (value === undefined) {
        return "";
    }

    return value.trim();
}

// Lit les réglages SMTP dans les variables d'environnement.
// Si une variable manque, on s'arrête tout de suite avec un message clair
// (mieux vaut le savoir au démarrage que le jour où quelqu'un s'inscrit).
export function readSmtpConfig(env: EnvVariables): SmtpConfig {
    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"];

    const missing: string[] = [];
    for (const name of required) {
        if (getValue(env, name) === "") {
            missing.push(name);
        }
    }

    if (missing.length > 0) {
        throw new Error("Configuration SMTP incomplète. Variables manquantes dans .env : " + missing.join(", "));
    }

    const portText = getValue(env, "SMTP_PORT");
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("SMTP_PORT doit être un nombre entre 1 et 65535 (valeur reçue : " + portText + ")");
    }

    return {
        host: getValue(env, "SMTP_HOST"),
        port: port,
        // true pour le port 465 (connexion chiffrée dès le départ), false pour le port 587 (chiffrement négocié ensuite)
        secure: getValue(env, "SMTP_SECURE").toLowerCase() === "true",
        user: getValue(env, "SMTP_USER"),
        password: getValue(env, "SMTP_PASSWORD"),
        from: getValue(env, "EMAIL_FROM"),
    };
}