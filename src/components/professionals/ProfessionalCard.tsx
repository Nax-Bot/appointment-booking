import Link from "next/link";
import { Banknote, ChevronRight, Clock } from "lucide-react";
import { ProfessionalSearchItem } from "@/types/booking";
import { formatDuration, formatPrice } from "@/lib/lib-front/format";
import { getInitials } from "@/lib/lib-front/text-helpers";

// Une carte de professionnel, cliquable sur toute sa surface.
// serviceId = le service filtré dans l'adresse (ou null) : on le transmet à la fiche.
interface ProfessionalCardProps {
    professional: ProfessionalSearchItem;
    serviceId: string | null;
    index?: number;
}

export default function ProfessionalCard({ professional, serviceId, index = 0 }: ProfessionalCardProps) {
    let href = "/professionals/" + professional.userId;
    if (serviceId !== null) {
        href = href + "?serviceId=" + serviceId;
    }

    let specialty = "Spécialité non renseignée";
    if (professional.specialty !== null) {
        specialty = professional.specialty;
    }

    // Avec un service filtré, la carte mène aux créneaux ; sinon, au profil
    let actionLabel = "Voir le profil";
    if (professional.offer !== null) {
        actionLabel = "Voir les créneaux";
    }

    return (
        <li style={{ "--i": index } as React.CSSProperties}>
            <Link
                href={href}
                className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
            >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tint to-white text-lg font-bold text-primary ring-1 ring-primary/15">
                    {getInitials(professional.firstName, professional.lastName)}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-ink">
                        {professional.firstName} {professional.lastName}
                    </p>
                    <p className="text-sm text-muted">{specialty}</p>

                    {professional.description !== null && (
                        <p className="mt-2 line-clamp-2 text-sm text-ink">{professional.description}</p>
                    )}

                    {/* Le prix et la durée de CE professionnel pour le service filtré */}
                    {professional.offer !== null && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-sm font-medium text-primary">
                                <Banknote className="h-4 w-4" />
                                {formatPrice(professional.offer.price)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-sm font-medium text-primary">
                                <Clock className="h-4 w-4" />
                                {formatDuration(professional.offer.duration)}
                            </span>
                        </div>
                    )}
                </div>

                <span className="hidden shrink-0 items-center gap-1 self-center text-sm font-medium text-primary sm:flex">
                    {actionLabel}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
            </Link>
        </li>
    );
}