// Nettoie un nom pour pouvoir comparer deux noms : "  Échographie " et "echographie" donnent le même résultat
export function normalizeName(text: string): string {
    // Sépare chaque lettre de son accent (é devient e + un accent), puis retire les accents
    const withoutAccents = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Tout en minuscules
    const lower = withoutAccents.toLowerCase();

    // Remplace les suites d'espaces par un seul espace, et retire les espaces au début et à la fin
    const singleSpaces = lower.replace(/\s+/g, " ");
    return singleSpaces.trim();
}