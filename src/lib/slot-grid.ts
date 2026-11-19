// Règles communes au calcul des créneaux (SlotService) et à la réservation (AppointmentService).
// Les deux services utilisent ce fichier pour que le front et l'API soient toujours d'accord.

// On propose un créneau toutes les 15 minutes, à partir du début de la plage de travail
export const SLOT_STEP_MINUTES = 15;

// Une plage de travail, en minutes depuis minuit (heure locale)
export interface TimeBlock {
    start: number;
    end: number;
}

// Trie les plages par heure de début, puis fusionne celles qui se touchent ou se chevauchent.
// Exemple : 08:00-12:00 et 12:00-14:00 deviennent 08:00-14:00.
export function mergeTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
    const sorted: TimeBlock[] = [];
    for (const block of blocks) {
        sorted.push({ start: block.start, end: block.end });
    }

    sorted.sort(function (a, b) {
        return a.start - b.start;
    });

    const merged: TimeBlock[] = [];
    for (const block of sorted) {
        if (merged.length === 0) {
            merged.push({ start: block.start, end: block.end });
        } else {
            const last = merged[merged.length - 1];

            if (block.start <= last.end) {
                if (block.end > last.end) {
                    last.end = block.end;
                }
            } else {
                merged.push({ start: block.start, end: block.end });
            }
        }
    }

    return merged;
}

// Vrai si cette heure de début (en minutes depuis minuit) tombe sur la grille des créneaux :
// elle doit être dans une plage fusionnée, à un multiple de 15 minutes après le début de cette plage.
// Exemple : plage 08:00-14:00 -> 08:00, 08:15, 08:30... sont valides, 09:07 ne l'est pas.
export function isOnSlotGrid(mergedBlocks: TimeBlock[], startMinutes: number): boolean {
    for (const block of mergedBlocks) {
        if (block.start <= startMinutes && startMinutes < block.end) {
            const gap = startMinutes - block.start;
            return gap % SLOT_STEP_MINUTES === 0;
        }
    }
    return false;
}

// Vrai si tout le rendez-vous (de startMinutes à endMinutes) tient dans UNE plage fusionnée.
// Exemple : plage 08:00-14:00 -> un rendez-vous 13:30-14:00 est couvert, 13:30-14:30 ne l'est pas.
export function isCoveredByBlocks(mergedBlocks: TimeBlock[], startMinutes: number, endMinutes: number): boolean {
    for (const block of mergedBlocks) {
        if (block.start <= startMinutes && endMinutes <= block.end) {
            return true;
        }
    }
    return false;
}
