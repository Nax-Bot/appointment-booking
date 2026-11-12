"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, ApiError } from "@/lib/lib-front/api-client";
import { ProfessionalSearchItem } from "@/types/booking";
import { SEARCH_PAUSE_MS } from "@/lib/lib-front/search-config";
import Input from "@/components/ui/Input";
import ErrorMessage from "@/components/ui/ErrorMessage";
import ProfessionalCard from "@/components/professionals/ProfessionalCard";

// Une « clé » qui décrit une recherche : le service filtré et le texte tapé.
// Elle sert à savoir si la liste affichée correspond bien à ce que la personne a tapé.
function makeKey(serviceId: string | null, searchText: string): string {
    let service = "";
    if (serviceId !== null) {
        service = serviceId;
    }
    return service + "|" + searchText;
}

export default function ProfessionalsBrowser() {
    // Dans l'adresse : /professionals?serviceId=3
    const searchParams = useSearchParams();
    const serviceId = searchParams.get("serviceId");

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ProfessionalSearchItem[]>([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    // La clé de la recherche à laquelle correspondent les résultats affichés
    const [searchedKey, setSearchedKey] = useState("");

    const searchText = query.trim();
    const currentKey = makeKey(serviceId, searchText);

    // « settled » = la liste affichée est à jour : elle correspond à ce qui est tapé.
    // Tant que ce n'est pas le cas (la personne tape encore, ou la requête est en cours),
    // on n'affiche AUCUN résultat : seulement « Recherche... ».
    const settled = searchedKey === currentKey;

    // Lance la recherche. Premier affichage ou champ vidé : tout de suite.
    // Sinon : après une pause. À chaque lettre tapée, la fonction renvoyée à la fin
    // du useEffect annule la recherche en attente.
    useEffect(() => {
        let cancelled = false;

        let delay = SEARCH_PAUSE_MS;
        if (searchText === "") {
            delay = 0;
        }

        const timer = setTimeout(async () => {
            // On construit l'adresse : /api/professionals?search=tojo&serviceId=3
            const params = new URLSearchParams();
            if (searchText !== "") {
                params.set("search", searchText);
            }
            if (serviceId !== null) {
                params.set("serviceId", serviceId);
            }

            let url = "/api/professionals";
            const queryString = params.toString();
            if (queryString !== "") {
                url = url + "?" + queryString;
            }

            try {
                const found = await apiGet<ProfessionalSearchItem[]>(url);
                if (cancelled === false) {
                    setResults(found);
                    setErrorMessage("");
                    setErrorDetails([]);
                }
            } catch (error) {
                if (cancelled === false) {
                    setResults([]);
                    if (error instanceof ApiError) {
                        setErrorMessage(error.message);
                        setErrorDetails(error.details);
                    } else {
                        setErrorMessage("Impossible de charger les professionnels");
                        setErrorDetails([]);
                    }
                }
            }

            if (cancelled === false) {
                // Ces résultats correspondent bien à ce qui est tapé
                setSearchedKey(makeKey(serviceId, searchText));
            }
        }, delay);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchText, serviceId]);

    // Ce que la zone de résultats doit montrer : une seule chose à la fois
    const showWaiting = settled === false;
    const showError = settled && errorMessage !== "";
    const showEmpty = settled && errorMessage === "" && results.length === 0;
    const showList = settled && errorMessage === "" && results.length > 0;

    // Le nom du service filtré, lu dans le premier résultat
    let serviceName = "";
    if (showList && results[0].offer !== null) {
        serviceName = results[0].offer.serviceName;
    }

    // Le message quand il n'y a aucun résultat
    let emptyText = "Aucun professionnel n'est inscrit pour le moment.";
    if (serviceId !== null) {
        emptyText = "Aucun professionnel ne propose ce service pour le moment.";
    }
    if (searchText !== "") {
        emptyText = "Aucun professionnel ne correspond à « " + searchText + " ».";
    }

    return (
        <div>
            {/* Titre suivi d'un trait */}
            <div className="mb-6 flex items-center gap-4">
                <h1 className="text-2xl font-bold text-ink">Professionnels</h1>
                <div className="h-px flex-1 bg-line" />
            </div>

            {/* Le service filtré, avec deux liens pour en sortir */}
            {serviceId !== null && (
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="rounded-full bg-tint px-3 py-1 font-medium text-primary">
                        {serviceName !== "" ? "Service : " + serviceName : "Service choisi"}
                    </span>
                    <Link href="/services" className="font-medium text-primary underline">
                        Changer de service
                    </Link>
                    <Link href="/professionals" className="font-medium text-primary underline">
                        Voir tous les professionnels
                    </Link>
                </div>
            )}

            <Input
                label="Rechercher un professionnel"
                placeholder="Nom, prénom ou spécialité"
                value={query}
                onChange={setQuery}
            />

            {/* Zone de résultats : hauteur minimale, pour que la page ne saute pas */}
            <div className="min-h-96">
                {showWaiting && (
                    <PageLoading kind="people" label="Recherche..." tone="client" compact />
                )}

                {showError && <ErrorMessage message={errorMessage} details={errorDetails} />}

                {showEmpty && (
                    <div className="flex h-48 items-center justify-center px-4 text-center text-sm break-words text-muted">
                        {emptyText}
                    </div>
                )}

                {showList && (
                    <ul className="stagger space-y-4">
                        {/* map = une carte par professionnel */}
                        {results.map((professional, index) => (
                            <ProfessionalCard
                                key={professional.userId}
                                professional={professional}
                                serviceId={serviceId}
                                index={index}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}