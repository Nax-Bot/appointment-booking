import Link from "next/link";
import { ChevronRight, Stethoscope } from "lucide-react";
import { ServiceSuggestion } from "@/types/api";
import { ProfessionalSearchItem } from "@/types/booking";
import { getInitials } from "@/lib/client/format/text-helpers";

// Les deux cartes « format suggestion » (centrées, avec un rond en haut).
// Elles servent à la fois pour les suggestions (carrousel) ET pour les résultats de recherche,
// afin que les deux aient exactement la même forme.

const CARD_CLASS =
    "group flex h-full flex-col items-center rounded-2xl border border-line bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10";

export function ProfessionalSuggestionCard({ professional }: { professional: ProfessionalSearchItem }) {
    let specialty = "Spécialité non renseignée";
    if (professional.specialty !== null) {
        specialty = professional.specialty;
    }
    return (
        <Link href={"/professionals/" + professional.userId} className={CARD_CLASS}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-white text-lg font-bold text-accent ring-1 ring-accent/20 transition-transform duration-300 group-hover:scale-105">
                {getInitials(professional.firstName, professional.lastName)}
            </span>
            <span className="mt-3 w-full truncate font-semibold text-ink">
                {professional.firstName} {professional.lastName}
            </span>
            <span className="mt-0.5 line-clamp-1 w-full text-sm text-muted">{specialty}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Voir le profil
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}

export function ServiceSuggestionCard({ service }: { service: ServiceSuggestion }) {
    return (
        <Link href={"/professionals?serviceId=" + service.id} className={CARD_CLASS}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-tint to-white text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
                <Stethoscope className="h-6 w-6" />
            </span>
            <span className="mt-3 w-full truncate font-semibold text-ink">{service.name}</span>
            <span className="mt-0.5 line-clamp-1 w-full text-sm text-muted">
                {service.description !== null && service.description !== "" ? service.description : "Service"}
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Voir les professionnels
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}
