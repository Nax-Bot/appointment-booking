import { toLocalMoment } from "@/lib/datetime";

// La date d'aujourd'hui à Madagascar, au format « 2026-11-09 »
export function getTodayLocalDate(): string {
    return toLocalMoment(new Date()).dateText;
}

// Le statut du backend en français : « PENDING » donne « En attente »
export function getStatusLabel(status: string): string {
    if (status === "PENDING") {
        return "En attente";
    }
    if (status === "CONFIRMED") {
        return "Confirmé";
    }
    if (status === "CANCELLED") {
        return "Annulé";
    }
    if (status === "COMPLETED") {
        return "Terminé";
    }
    if (status === "NO_SHOW") {
        return "Absent";
    }
    return status;
}

// Les couleurs du badge de chaque statut
export function getStatusStyle(status: string): string {
    if (status === "PENDING") {
        return "bg-amber-100 text-amber-800";
    }
    if (status === "CONFIRMED") {
        return "bg-tint text-primary";
    }
    if (status === "COMPLETED") {
        return "bg-green-100 text-green-800";
    }
    if (status === "NO_SHOW") {
        return "bg-red-100 text-red-700";
    }
    return "bg-gray-100 text-gray-600";
}