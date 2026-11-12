// Couleurs des animations Lottie, selon le rôle.
// Les fichiers JSON nomment leurs fills/strokes "primary", "accent" ou "soft" :
// on les recolore ici au moment de l'affichage (un seul JSON pour tous les rôles).
export type LoaderTone = "client" | "pro" | "danger" | "light";

interface TonePalette {
    primary: string;
    accent: string;
    soft: string;
}

export const TONES: Record<LoaderTone, TonePalette> = {
    client: { primary: "#15803d", accent: "#22c55e", soft: "#bbf7d0" },
    pro: { primary: "#0f766e", accent: "#f59e0b", soft: "#99f6e4" },
    // sur un bouton coloré : tout en blanc
    light: { primary: "#ffffff", accent: "#ffffffcc", soft: "#ffffff40" },
    danger: { primary: "#dc2626", accent: "#f87171", soft: "#fecaca" },
};

function hexToRgba(hex: string): number[] {
    const alpha = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
    const n = parseInt(hex.slice(1, 7), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

// Renvoie une copie de l'animation avec les couleurs du rôle
export function applyTone<T extends object>(data: T, tone: LoaderTone): T {
    const palette = TONES[tone];
    const copy = JSON.parse(JSON.stringify(data)) as T;

    function walk(node: unknown) {
        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }
        if (node === null || typeof node !== "object") {
            return;
        }
        const obj = node as Record<string, unknown>;
        const name = obj.nm;
        if ((obj.ty === "fl" || obj.ty === "st") && typeof name === "string" && name in palette) {
            const color = obj.c as { a: number; k: unknown } | undefined;
            if (color !== undefined && color.a === 0) {
                color.k = hexToRgba(palette[name as keyof TonePalette]);
            }
        }
        Object.values(obj).forEach(walk);
    }

    walk(copy);
    return copy;
}
