import { RateLimitRepository } from "@/repositories/rate-limit.repository";
import { RateLimitRule } from "@/lib/server/auth/rate-limit-rules";

/// LIMITE DE REQUETE
// On garde un compteur inactif 24 heures, puis on le supprime
const KEEP_HOURS = 24;

export class RateLimitService {
    private rateLimitRepository: RateLimitRepository;

    constructor(rateLimitRepository: RateLimitRepository) {
        this.rateLimitRepository = rateLimitRepository;
    }

    
    // Combien de secondes faut-il encore attendre pour cette clé ?
    // 0 si elle n'est pas bloquée.
    async getRetryAfterSeconds(limitKey: string): Promise<number> {
        const row = await this.rateLimitRepository.findByKey(limitKey);

        // SI AUCUN BLOCAGE => 0
        if (!row || row.blockedUntil === null) {
            return 0;
        }
        // LORSQUE LE TEMPS IMPARTIE EST
        const remainingMs = row.blockedUntil.getTime() - Date.now();
        if (remainingMs <= 0) {
            return 0;
        }

        // Arrondissement mais on prend le plus petite valeur possible
        return Math.ceil(remainingMs / 1000);
    }

    // Enregistre un échec pour cette clé, et bloque si la règle est atteinte
    async registerFailure(limitKey: string, rule: RateLimitRule): Promise<void> {
        const nowMs = Date.now();
        const now = new Date(nowMs);

        // Si la fenêtre est finie OU si le blocage est terminé, on repart de zéro
        const existing = await this.rateLimitRepository.findByKey(limitKey);
        if (existing) {
            const windowEnded = nowMs - existing.windowStart.getTime() > rule.windowSeconds * 1000;

            let blockEnded = false;
            if (existing.blockedUntil !== null && existing.blockedUntil.getTime() <= nowMs) {
                blockEnded = true;
            }

            if (windowEnded || blockEnded) {
                await this.rateLimitRepository.restartWindow(limitKey, now);
            }
        }

        // On ajoute l'échec, puis on bloque si le compteur atteint la limite
        const updated = await this.rateLimitRepository.incrementFailures(limitKey, now);
        if (updated.count >= rule.maxFailures) {
            const blockedUntil = new Date(nowMs + rule.blockSeconds * 1000);
            await this.rateLimitRepository.setBlockedUntil(limitKey, blockedUntil);
        }

        // Nettoyage au passage : les vieux compteurs inutiles disparaissent
        const oldLimit = new Date(nowMs - KEEP_HOURS * 60 * 60 * 1000);
        await this.rateLimitRepository.deleteExpired(oldLimit, now);
    }

    // Efface le compteur d'une clé (après une réussite)
    async reset(limitKey: string): Promise<void> {
        await this.rateLimitRepository.deleteByKey(limitKey);
    }
}