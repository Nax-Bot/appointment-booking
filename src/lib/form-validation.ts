// Fonctions de vérification pour les formulaires.
// Elles servent seulement à guider l'utilisateur : le backend reste le juge final.

// Vérifie grossièrement la forme d'un email : texte@texte.texte, sans espace
export function isEmailValid(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
}

// Les 5 critères affichés sous le champ mot de passe
export interface PasswordChecks {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    digit: boolean;
    special: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
    return {
        length: password.length >= 8,
        // Une majuscule existe si le texte change quand on le passe en minuscules
        uppercase: password !== password.toLowerCase(),
        // Une minuscule existe si le texte change quand on le passe en majuscules
        lowercase: password !== password.toUpperCase(),
        digit: /[0-9]/.test(password),
        // Caractère spécial = ni lettre ni chiffre
        special: /[^A-Za-z0-9]/.test(password),
    };
}

// Le niveau de force : nombre de critères respectés, et le texte à afficher
export interface PasswordStrength {
    score: number; // de 0 à 5
    label: string; // Faible, Moyen ou Fort
}

export function getPasswordStrength(password: string): PasswordStrength {
    const checks = getPasswordChecks(password);

    let score = 0;
    if (checks.length) {
        score = score + 1;
    }
    if (checks.uppercase) {
        score = score + 1;
    }
    if (checks.lowercase) {
        score = score + 1;
    }
    if (checks.digit) {
        score = score + 1;
    }
    if (checks.special) {
        score = score + 1;
    }

    let label = "Faible";
    if (score === 5) {
        label = "Fort";
    } else if (score >= 3) {
        label = "Moyen";
    }

    return { score: score, label: label };
}