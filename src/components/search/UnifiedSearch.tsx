"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Stethoscope, Users, X } from "lucide-react";
import { apiGet, ApiError } from "@/lib/lib-front/api-client";
import { ServiceSuggestion } from "@/types/api";
import { ProfessionalSearchItem } from "@/types/booking";
import { SEARCH_PAUSE_MS } from "@/lib/lib-front/search-config";
import PageLoading from "@/components/ui/PageLoading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import ProfessionalCard from "@/components/professionals/ProfessionalCard";
import ProfessionalCarousel from "@/components/search/ProfessionalCarousel";
import NextAppointmentCard from "@/components/search/NextAppointmentCard";
import { useSession } from "@/context/session-context";

type Filter = "all" | "services" | "professionals";

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "services", label: "Services" },
    { value: "professionals", label: "Professionnels" },
];

// Décrit une recherche (texte + filtre) : sert à savoir si les résultats affichés sont à jour
function makeKey(filter: Filter, searchText: string): string {
    return filter + "|" + searchText;
}

export default function UnifiedSearch() {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const { user } = useSession();
    // Les spécialités des professionnels, pour les raccourcis sous la barre de recherche
    const [specialties, setSpecialties] = useState<string[]>([]);

    function handleCarouselLoaded(items: ProfessionalSearchItem[]) {
        const found: string[] = [];
        items.forEach((item) => {
            if (item.specialty !== null && found.includes(item.specialty) === false) {
                found.push(item.specialty);
            }
        });
        setSpecialties(found.slice(0, 6));
    }

    const [services, setServices] = useState<ServiceSuggestion[]>([]);
    const [professionals, setProfessionals] = useState<ProfessionalSearchItem[]>([]);
    const [serviceError, setServiceError] = useState("");
    const [professionalError, setProfessionalError] = useState("");
    // La clé de la recherche à laquelle correspondent les résultats affichés
    const [searchedKey, setSearchedKey] = useState("");

    const searchText = query.trim();
    const hasQuery = searchText !== "";
    const currentKey = makeKey(filter, searchText);
    const settled = hasQuery && searchedKey === currentKey;

    // Faut-il chercher les services / les professionnels ?
    // Les services exigent 2 caractères au minimum (règle du backend).
    const wantServices = filter !== "professionals" && searchText.length >= 2;
    const wantProfessionals = filter !== "services";

    useEffect(() => {
        if (searchText === "") {
            return undefined;
        }

        let cancelled = false;

        const timer = setTimeout(async () => {
            const servicePromise: Promise<ServiceSuggestion[]> = wantServices
                ? apiGet<ServiceSuggestion[]>(
                      "/api/services/suggestions?name=" + encodeURIComponent(searchText)
                  )
                : Promise.resolve([]);
            const professionalPromise: Promise<ProfessionalSearchItem[]> = wantProfessionals
                ? apiGet<ProfessionalSearchItem[]>(
                      "/api/professionals?search=" + encodeURIComponent(searchText)
                  )
                : Promise.resolve([]);

            const [serviceResult, professionalResult] = await Promise.allSettled([
                servicePromise,
                professionalPromise,
            ]);

            if (cancelled) {
                return;
            }

            if (serviceResult.status === "fulfilled") {
                setServices(serviceResult.value);
                setServiceError("");
            } else {
                setServices([]);
                setServiceError(errorText(serviceResult.reason, "Impossible de chercher les services"));
            }

            if (professionalResult.status === "fulfilled") {
                setProfessionals(professionalResult.value);
                setProfessionalError("");
            } else {
                setProfessionals([]);
                setProfessionalError(
                    errorText(professionalResult.reason, "Impossible de chercher les professionnels")
                );
            }

            setSearchedKey(makeKey(filter, searchText));
        }, SEARCH_PAUSE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchText, filter, wantServices, wantProfessionals]);

    const showServices = filter !== "professionals";
    const showProfessionals = filter !== "services";

    // Les services ne se cherchent qu'à partir de 2 caractères : on prévient la personne
    const serviceTooShort = filter === "services" && searchText.length < 2;

    const totalCount = (showServices ? services.length : 0) + (showProfessionals ? professionals.length : 0);
    const errorMessage = firstError(showServices, showProfessionals, serviceError, professionalError);

    let greeting = "Bonjour";
    if (user !== null) {
        greeting = "Bonjour " + user.firstName;
    }

    return (
        <div>
            {/* En-tête d'accueil : un grand titre et la barre de recherche en vedette */}
            <section className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-tint via-white to-white px-5 py-10 text-center sm:px-10 sm:py-14">
                <div className="pointer-events-none absolute -top-20 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

                <p className="animate-rise relative text-sm font-medium text-primary">{greeting}</p>
                <h1
                    className="animate-rise relative mx-auto mt-2 max-w-6xl text-3xl font-extrabold tracking-tight text-ink sm:text-5xl"
                    style={{ animationDelay: "60ms" }}
                >
                    Prenez rendez-vous avec le bon{" "}
                    <span className="relative inline-block whitespace-nowrap">
                        {/* Même police que le reste du site : seul le dégradé de couleur distingue le mot */}
                        <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                            professionnel.
                        </span>
                        {/* Petit trait courbe sous le mot */}
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 200 12"
                            preserveAspectRatio="none"
                            className="absolute -bottom-2 left-0 h-2.5 w-full text-primary/35"
                        >
                            <path d="M2 8 C 50 1, 100 1, 198 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                    </span>
                </h1>
                <p
                    className="animate-rise relative mx-auto mt-4 max-w-xl text-muted"
                    style={{ animationDelay: "120ms" }}
                >
                    Cherchez un service ou un professionnel (nom, prénom ou spécialité), puis
                    réservez un créneau en quelques clics.
                </p>

                {/* Barre de recherche */}
                <div className="animate-rise relative mx-auto mt-8 max-w-3xl" style={{ animationDelay: "180ms" }}>
                    <Search className="pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Ex. Consultation, Rakoto, Dentiste…"
                        aria-label="Rechercher un service ou un professionnel"
                        className="block w-full rounded-full border border-line bg-white py-4 pr-12 pl-14 text-ink shadow-lg shadow-primary/5 transition-shadow duration-200 placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                    />
                    {query !== "" && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Effacer la recherche"
                            className="absolute top-1/2 right-4 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint hover:text-ink"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Raccourcis : cliquer sur une spécialité la tape dans la recherche */}
                {specialties.length > 0 && (
                    <div className="animate-rise relative mt-4 flex flex-wrap justify-center gap-2" style={{ animationDelay: "240ms" }}>
                        {specialties.map((specialty) => (
                            <button
                                key={specialty}
                                type="button"
                                onClick={() => setQuery(specialty)}
                                className="rounded-full border border-line bg-white/80 px-3.5 py-1 text-sm text-ink/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-tint hover:text-primary active:scale-95"
                            >
                                {specialty}
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0">
                    {/* Filtre : tout, services seulement, ou professionnels seulement */}
                    <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les résultats">
                        <span className="mr-1 text-sm text-muted">Afficher</span>
                        <div className="inline-flex rounded-full border border-line bg-white p-1 shadow-sm">
                            {FILTERS.map((item) => {
                                const active = filter === item.value;
                                let chipClass = "text-ink/70 hover:text-ink";
                                if (active) {
                                    chipClass = "bg-primary text-white shadow-sm";
                                }
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setFilter(item.value)}
                                        aria-pressed={active}
                                        className={
                                            "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 " +
                                            chipClass
                                        }
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Suggestions de professionnels, sous la recherche */}
                    <ProfessionalCarousel onLoaded={handleCarouselLoaded} />

            {/* Résultats */}
            <div className="min-h-48">
                {hasQuery === false && (
                    <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted">
                        Tapez un mot pour lancer la recherche.
                    </div>
                )}

                {hasQuery && settled === false && (
                    <PageLoading kind="search" label="Recherche..." tone="client" compact />
                )}

                {settled && errorMessage !== "" && <ErrorMessage message={errorMessage} details={[]} />}

                {settled && errorMessage === "" && totalCount === 0 && (
                    <div className="flex h-40 items-center justify-center px-4 text-center text-sm break-words text-muted">
                        {serviceTooShort
                            ? "Tapez au moins 2 caractères pour chercher un service."
                            : "Aucun résultat pour « " + searchText + " »."}
                    </div>
                )}

                {settled && errorMessage === "" && totalCount > 0 && (
                    <div className="space-y-8">
                        {showServices && services.length > 0 && (
                            <section>
                                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                                    <Stethoscope className="h-4 w-4 text-primary" />
                                    Services
                                    <span className="rounded-full bg-tint px-2 py-0.5 text-xs text-primary">
                                        {services.length}
                                    </span>
                                </h2>
                                <ul className="stagger grid gap-3 sm:grid-cols-2">
                                    {services.map((service, index) => (
                                        <li key={service.id} style={{ "--i": index } as React.CSSProperties}>
                                            <Link
                                                href={"/professionals?serviceId=" + service.id}
                                                className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-ink">
                                                        {service.name}
                                                    </span>
                                                    {service.description !== null && (
                                                        <span className="line-clamp-2 block text-sm text-muted">
                                                            {service.description}
                                                        </span>
                                                    )}
                                                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                                                        <Users className="h-3.5 w-3.5" />
                                                        Voir les professionnels
                                                    </span>
                                                </span>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {showProfessionals && professionals.length > 0 && (
                            <section>
                                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                                    <Users className="h-4 w-4 text-primary" />
                                    Professionnels
                                    <span className="rounded-full bg-tint px-2 py-0.5 text-xs text-primary">
                                        {professionals.length}
                                    </span>
                                </h2>
                                <ul className="stagger space-y-4">
                                    {professionals.map((professional, index) => (
                                        <ProfessionalCard
                                            key={professional.userId}
                                            professional={professional}
                                            serviceId={null}
                                            index={index}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </div>
                </div>

                {/* Colonne de droite : le prochain rendez-vous */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <NextAppointmentCard />
                </aside>
            </div>
        </div>
    );
}

// Le texte d'une erreur : celui de l'API si c'est une ApiError, sinon un message par défaut
function errorText(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        return error.message;
    }
    return fallback;
}

// Une erreur n'est montrée que si elle concerne une source affichée
// (et pour « Tous », seulement si les deux sources ont échoué, sinon on garde ce qui marche).
function firstError(
    showServices: boolean,
    showProfessionals: boolean,
    serviceError: string,
    professionalError: string
): string {
    if (showServices && showProfessionals) {
        if (serviceError !== "" && professionalError !== "") {
            return professionalError;
        }
        return "";
    }
    if (showServices) {
        return serviceError;
    }
    return professionalError;
}
