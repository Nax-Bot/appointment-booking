// 80000 devient « 80 000 Ar »
export function formatPrice(price: number): string {
    const formatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
    return formatter.format(price) + " Ar";
}

// 45 devient « 45 min », 90 devient « 1 h 30 », 120 devient « 2 h »
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return minutes + " min";
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (rest === 0) {
        return hours + " h";
    }
    return hours + " h " + rest;
}

// « 2026-11-01 » devient « 01/11/2026 ».
// On découpe le texte : aucune conversion de fuseau horaire, donc aucun décalage possible.
export function formatDate(dateText: string): string {
    const parts = dateText.split("-");
    if (parts.length !== 3) {
        return dateText;
    }
    return parts[2] + "/" + parts[1] + "/" + parts[0];
}

// Le texte de la période de validité d'une plage, ou "" si elle est valable tout le temps
export function formatValidity(validFrom: string | null, validTo: string | null): string {
    if (validFrom !== null && validTo !== null) {
        return "du " + formatDate(validFrom) + " au " + formatDate(validTo);
    }
    if (validFrom !== null) {
        return "à partir du " + formatDate(validFrom);
    }
    if (validTo !== null) {
        return "jusqu'au " + formatDate(validTo);
    }
    return "";
}