/** 
 * Une règle de limitation : 
 * combien d'échecs ?
 * dans quelle fenêtre ?
 * et combien de temps de blocage ?
 * 
 * */
export interface RateLimitRule {
    maxFailures: number;
    windowSeconds: number;
    blockSeconds: number;
}

/**
 * Connexion : 5 échecs en 15 minutes pour un même COUPLE
 * COUPLE [ email + adresse IP]
 * /> puis blocage de 15 minutes.
 * Le couple est ce qui bloque : un tiers qui tape de faux mots de passe depuis SON adresse
 * ne peut donc pas empêcher le vrai propriétaire de se connecter depuis la sienne.
 * */
export const LOGIN_BY_PAIR_RULE: RateLimitRule = {
    maxFailures: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};

// Connexion : garde-fou par email, toutes adresses confondues (attaque répartie sur beaucoup d'adresses).
// La limite est haute exprès : avec 5 elle permettrait de verrouiller le compte de quelqu'un d'autre.
export const LOGIN_BY_EMAIL_RULE: RateLimitRule = {
    maxFailures: 50,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};

// Connexion : 20 échecs en 15 minutes depuis une même adresse IP (tous emails confondus), puis blocage de 15 minutes
export const LOGIN_BY_IP_RULE: RateLimitRule = {
    maxFailures: 20,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};

// Inscription : 10 demandes par heure et par adresse IP, puis blocage d'une heure
export const REGISTER_BY_IP_RULE: RateLimitRule = {
    maxFailures: 10,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60,
};

// Vérification du code : 30 essais en 15 minutes par adresse IP, puis blocage de 15 minutes
// (les essais par code sont déjà limités à 5 dans le service)
export const VERIFY_BY_IP_RULE: RateLimitRule = {
    maxFailures: 30,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};

// Renvoi de code : 10 demandes en 15 minutes par adresse IP, puis blocage de 15 minutes
export const RESEND_BY_IP_RULE: RateLimitRule = {
    maxFailures: 10,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};
// Avis "compte déjà existant" : au plus UN email par heure et par adresse, pour ne pas inonder la boîte de quelqu'un
export const ACCOUNT_NOTICE_RULE: RateLimitRule = {
    maxFailures: 1,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60,
};

// Mot de passe oublié : 10 demandes en 15 minutes par adresse IP, puis blocage de 15 minutes
export const FORGOT_BY_IP_RULE: RateLimitRule = {
    maxFailures: 10,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};

// Mot de passe oublié : au plus 3 emails par heure pour une même adresse email
// (empêche d'inonder la boîte de quelqu'un en demandant des codes sans arrêt)
export const FORGOT_BY_EMAIL_RULE: RateLimitRule = {
    maxFailures: 3,
    windowSeconds: 60 * 60,
    blockSeconds: 60 * 60,
};

// Réinitialisation : 30 essais en 15 minutes par adresse IP, puis blocage de 15 minutes
// (les essais par code sont déjà limités à 5 dans le service)
export const RESET_BY_IP_RULE: RateLimitRule = {
    maxFailures: 30,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};

// Changement de mot de passe : 5 mauvais "mot de passe actuel" en 15 minutes par utilisateur, puis blocage de 15 minutes
// (protège contre quelqu'un qui aurait volé une session ouverte et chercherait le mot de passe)
export const CHANGE_PASSWORD_RULE: RateLimitRule = {
    maxFailures: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
};
