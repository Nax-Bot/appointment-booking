// Une règle de limitation : combien d'échecs, dans quelle fenêtre, et combien de temps de blocage
export interface RateLimitRule {
  maxFailures: number;
  windowSeconds: number;
  blockSeconds: number;
}

// Connexion : 5 échecs en 15 minutes pour un même email, puis blocage de 15 minutes
export const LOGIN_BY_EMAIL_RULE: RateLimitRule = {
  maxFailures: 5,
  windowSeconds: 15 * 60,
  blockSeconds: 15 * 60,
};

// Connexion : 20 échecs en 15 minutes depuis une même adresse IP (tous emails confondus), puis blocage de 15 minutes
export const LOGIN_BY_IP_RULE: RateLimitRule = {
  maxFailures: 20,
  windowSeconds: 15 * 60,
  blockSeconds: 15 * 60,
};