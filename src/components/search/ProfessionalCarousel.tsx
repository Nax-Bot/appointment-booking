"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/client/api-client";
import { ProfessionalSearchItem } from "@/types/booking";
import { ProfessionalSuggestionCard } from "@/components/search/SuggestionCards";

// Nombre maximum de professionnels proposés dans le carrousel
const MAX_SUGGESTIONS = 12;

// Carrousel de suggestions : des professionnels à découvrir, sous la barre de recherche.
// Il charge la liste une seule fois ; s'il y a une erreur ou aucun professionnel, il disparaît.
export default function ProfessionalCarousel({
    onLoaded,
}: {
    onLoaded?: (items: ProfessionalSearchItem[]) => void;
}) {
    const [items, setItems] = useState<ProfessionalSearchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const trackRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const found = await apiGet<ProfessionalSearchItem[]>("/api/professionals");
                if (cancelled === false) {
                    setItems(found.slice(0, MAX_SUGGESTIONS));
                    if (onLoaded !== undefined) {
                        onLoaded(found);
                    }
                }
            } catch (error) {
                console.error(error);
            }
            if (cancelled === false) {
                setLoading(false);
            }
        }
        load();

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fait glisser le carrousel d'environ une « page » vers la gauche (-1) ou la droite (1)
    function scrollByPage(direction: number) {
        const track = trackRef.current;
        if (track === null) {
            return;
        }
        track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
    }

    if (loading === false && items.length === 0) {
        return null;
    }

    return (
        <section className="mb-6" aria-label="Suggestions de professionnels">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Suggestions de professionnels
                </h2>
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => scrollByPage(-1)}
                        aria-label="Précédent"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink transition-all hover:border-primary/40 hover:bg-tint active:scale-95"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollByPage(1)}
                        aria-label="Suivant"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink transition-all hover:border-primary/40 hover:bg-tint active:scale-95"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <ul
                ref={trackRef}
                className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {loading &&
                    [0, 1, 2, 3].map((n) => (
                        <li key={n} className="w-56 shrink-0 snap-start">
                            <div className="skeleton h-32 rounded-2xl" />
                        </li>
                    ))}

                {loading === false &&
                    items.map((professional) => (
                        <li key={professional.userId} className="w-56 shrink-0 snap-start">
                            <ProfessionalSuggestionCard professional={professional} />
                        </li>
                    ))}
            </ul>
        </section>
    );
}
