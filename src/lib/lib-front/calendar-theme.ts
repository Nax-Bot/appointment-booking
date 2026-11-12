// Les couleurs des événements du calendrier. Une seule source : tous les écrans (jour, semaine, mois,
// légende, fenêtres) lisent ces couleurs, donc ils restent cohérents.
//
// Tout le reste (texte, bordures, fonds, vert principal) vient du thème de l'application, comme les
// autres pages : text-ink, text-muted, border-line, bg-primary, bg-tint... Il n'y a donc rien à régler
// ici pour ça. Seuls les statuts ont leurs couleurs, ci-dessous.
//
// Les classes sont écrites en toutes lettres (et pas assemblées) pour que Tailwind les repère.
import type { CSSProperties } from "react";

export type ToneKey =
    | "availability"
    | "absence"
    | "CONFIRMED"
    | "PENDING"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";

export interface Tone {
    label: string; // dans la légende
    block: string; // fond + texte
    dot: string; // petit point de couleur
    bar: string; // barre d'accent à gauche d'un bloc
    swatch: string; // la pastille de la légende
}

export const TONES: Record<ToneKey, Tone> = {
    // Disponible : émeraude doux
    availability: {
        label: "Disponible",
        block: "bg-[#D5F5E3] text-[#166534]",
        dot: "bg-[#22C55E]",
        bar: "border-[#22C55E]",
        swatch: "bg-[#D5F5E3] ring-1 ring-inset ring-[#22C55E]/60",
    },
    // Absence : rose
    absence: {
        label: "Absence",
        block: "bg-[#FFE1E6] text-[#BE123C]",
        dot: "bg-[#F43F5E]",
        bar: "border-[#F43F5E]",
        swatch: "bg-[#FFE1E6] ring-1 ring-inset ring-[#F43F5E]/60",
    },
    // Confirmé : le teal plein, c'est le plus important à l'écran
    CONFIRMED: {
        label: "Confirmé",
        block: "bg-[#0F766E] text-white",
        dot: "bg-[#0F766E]",
        bar: "border-[#134E4A]",
        swatch: "bg-[#0F766E]",
    },
    // En attente : ambre
    PENDING: {
        label: "En attente",
        block: "bg-[#FDE8B0] text-[#92400E]",
        dot: "bg-[#F59E0B]",
        bar: "border-[#F59E0B]",
        swatch: "bg-[#FDE8B0] ring-1 ring-inset ring-[#F59E0B]/60",
    },
    // Terminé : bleu
    COMPLETED: {
        label: "Terminé",
        block: "bg-[#D6E6FF] text-[#1E40AF]",
        dot: "bg-[#3B82F6]",
        bar: "border-[#3B82F6]",
        swatch: "bg-[#D6E6FF] ring-1 ring-inset ring-[#3B82F6]/60",
    },
    // Annulé : gris neutre
    CANCELLED: {
        label: "Annulé",
        block: "bg-[#ECEFF1] text-[#6B7280]",
        dot: "bg-[#9CA3AF]",
        bar: "border-[#9CA3AF]",
        swatch: "bg-[#ECEFF1] ring-1 ring-inset ring-[#9CA3AF]/70",
    },
    // Un client qui ne s'est pas présenté : même teinte neutre qu'un rendez-vous annulé
    NO_SHOW: {
        label: "Non présenté",
        block: "bg-[#ECEFF1] text-[#6B7280]",
        dot: "bg-[#9CA3AF]",
        bar: "border-[#9CA3AF]",
        swatch: "bg-[#ECEFF1] ring-1 ring-inset ring-[#9CA3AF]/70",
    },
};

// Les couleurs d'un rendez-vous selon son statut (statut inconnu : teinte neutre)
export function toneOf(status: string): Tone {
    if (status in TONES) {
        return TONES[status as ToneKey];
    }
    return TONES.CANCELLED;
}

// Les rendez-vous annulés ou non présentés sont affichés « barrés » et plus pâles
export function isMutedStatus(status: string): boolean {
    return status === "CANCELLED" || status === "NO_SHOW";
}

// Les rayures discrètes d'une absence
export const ABSENCE_STRIPES: CSSProperties = {
    backgroundImage:
        "repeating-linear-gradient(135deg, rgba(244,63,94,0.13) 0 6px, rgba(244,63,94,0.02) 6px 12px)",
};
