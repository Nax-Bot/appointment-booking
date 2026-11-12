// Un jour de la semaine : la valeur du backend (0 = dimanche ... 6 = samedi),
// son nom complet et son nom court
export interface WeekDay {
    value: number;
    label: string;
    short: string;
}

// La semaine commence le lundi dans l'affichage ; le dimanche (0) est à la fin
export const WEEK_DAYS: WeekDay[] = [
    { value: 1, label: "Lundi", short: "Lun" },
    { value: 2, label: "Mardi", short: "Mar" },
    { value: 3, label: "Mercredi", short: "Mer" },
    { value: 4, label: "Jeudi", short: "Jeu" },
    { value: 5, label: "Vendredi", short: "Ven" },
    { value: 6, label: "Samedi", short: "Sam" },
    { value: 0, label: "Dimanche", short: "Dim" },
];

// 1 devient « Lundi »
export function getDayName(dayOfWeek: number): string {
    for (const day of WEEK_DAYS) {
        if (day.value === dayOfWeek) {
            return day.label;
        }
    }
    return "";
}

// 1 devient « Lun »
export function getDayShortName(dayOfWeek: number): string {
    for (const day of WEEK_DAYS) {
        if (day.value === dayOfWeek) {
            return day.short;
        }
    }
    return "";
}

// La place d'un jour dans la semaine : lundi = 0 ... dimanche = 6.
// (Dans le backend, dimanche vaut 0 et lundi vaut 1 : on décale pour ranger du lundi au dimanche.)
// C'est aussi la position du jour dans la liste WEEK_DAYS.
export function getDayOrder(dayOfWeek: number): number {
    return (dayOfWeek + 6) % 7;
}