"use client";

import { FormEvent, useEffect, useState } from "react";
import LottieLoader from "@/components/ui/LottieLoader";
import { ArrowLeft } from "lucide-react";
import { apiGet, apiPost, apiPut, ApiError } from "@/lib/lib-front/api-client";
import { CreateServiceInput, Offer, ServiceSuggestion, SetOfferInput } from "@/types/api";
import { formatDuration, formatPrice } from "@/lib/lib-front/format";
import {
    NAME_MAX,
    getDurationError,
    getNameError,
    getPriceError,
    parseNumber,
} from "@/lib/lib-front/offer-validation";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PriceDurationFields from "@/components/services/PriceDurationFields";

const DESCRIPTION_MAX = 2000;

// La pause (en millisecondes) que la personne doit faire pour que la recherche démarre.
// Tant qu'elle tape, on ne cherche pas. 1000 = 1 seconde. Pour changer la durée, modifie ce nombre.
const SEARCH_PAUSE_MS = 500;

// Les trois écrans de la fenêtre :
// "search"  = on tape un nom et on regarde les suggestions
// "propose" = on a choisi un service existant : on fixe notre prix et notre durée
// "create"  = on crée un nouveau service
type Mode = "search" | "propose" | "create";

// Le backend refuse une description vide : pour ne rien envoyer, on envoie null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") {
        return null;
    }
    return trimmed;
}

// existingServiceIds = les services que le professionnel propose déjà
// onSaved = appelée quand l'ajout a réussi (la page ferme alors la fenêtre)
interface AddServiceModalProps {
    existingServiceIds: number[];
    onClose: () => void;
    onSaved: (offer: Offer, message: string) => void;
}

export default function AddServiceModal({
    existingServiceIds,
    onClose,
    onSaved,
}: AddServiceModalProps) {
    const [mode, setMode] = useState<Mode>("search");

    // Écran de recherche
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([]);
    const [searching, setSearching] = useState(false); // une requête est-elle en cours ?
    const [searchError, setSearchError] = useState("");
    // Le texte auquel correspondent les suggestions reçues.
    // Si searchedText est différent du texte tapé, ces suggestions sont « périmées » : on ne les montre pas.
    const [searchedText, setSearchedText] = useState("");

    // Le service choisi dans la liste (écran « propose »)
    const [selected, setSelected] = useState<ServiceSuggestion | null>(null);

    // Les champs des écrans « propose » et « create »
    const [nameInput, setNameInput] = useState("");
    const [descriptionInput, setDescriptionInput] = useState("");
    const [priceText, setPriceText] = useState("");
    const [durationText, setDurationText] = useState("");
    const [submitted, setSubmitted] = useState(false); // a-t-on déjà cliqué sur le bouton ?

    // Envoi
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    const [isdisplay, setIsdisplay] = useState(false);

    const searchText = query.trim();
    const hasQuery = searchText.length >= 2; // le backend exige 2 caractères au minimum

    // Lance la recherche quand la personne fait une pause.
    // À chaque lettre tapée, la fonction renvoyée à la fin du useEffect annule la recherche
    // en attente : tant que la personne tape, aucune requête ne part.
    useEffect(() => {
        // Moins de 2 caractères : on efface les résultats précédents
        if (searchText.length < 2) {
            setSuggestions([]);
            setSearchedText("");
            setSearchError("");
            return undefined;
        }

        let cancelled = false;

        const timer = setTimeout(async () => {
            setSearching(true);
            setSearchError("");
            try {
                const result = await apiGet<ServiceSuggestion[]>(
                    "/api/services/suggestions?name=" + encodeURIComponent(searchText)
                );
                if (cancelled === false) {
                    setSuggestions(result);
                }
            } catch (error) {
                if (cancelled === false) {
                    setSuggestions([]);
                    if (error instanceof ApiError) {
                        setSearchError(error.message);
                    } else {
                        setSearchError("Impossible de chercher les services");
                    }
                }
            }
            if (cancelled === false) {
                // Ces suggestions correspondent bien au texte tapé
                setSearchedText(searchText);
                setSearching(false);
            }
        }, SEARCH_PAUSE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            setSearching(false);
        };
    }, [searchText]);

    // « settled » = la réponse est à jour : elle correspond au texte actuellement tapé.
    // Tant que ce n'est pas le cas (la personne tape encore, ou la requête est en cours),
    // on n'affiche AUCUN résultat : seulement « Recherche... ».
    const settled = hasQuery && searching === false && searchedText === searchText;

    // Y a-t-il un service au nom identique à ce qui est tapé ?
    let hasExact = false;
    if (settled) {
        for (const suggestion of suggestions) {
            if (suggestion.exact) {
                hasExact = true;
            }
        }
    }

    // Ce que le panneau montre en son centre : une seule chose à la fois
    const showList = settled && searchError === "" && suggestions.length > 0;
    const showError = settled && searchError !== "";
    const showNoResult = settled && searchError === "" && suggestions.length === 0;
    const showWaiting = settled === false;

    // Le professionnel propose-t-il déjà ce service ?
    function isAlreadyOffered(serviceId: number): boolean {
        for (const id of existingServiceIds) {
            if (id === serviceId) {
                return true;
            }
        }
        return false;
    }

    function resetForm() {
        setPriceText("");
        setDurationText("");
        setSubmitted(false);
        setErrorMessage("");
        setErrorDetails([]);
    }

    // On choisit un service existant de la liste
    function startPropose(suggestion: ServiceSuggestion) {
        resetForm();
        setSelected(suggestion);
        setMode("propose");
    }

    // On crée un nouveau service : le nom tapé est repris dans le formulaire
    function startCreate() {
        resetForm();
        setNameInput(searchText);
        setDescriptionInput("");
        setMode("create");
    }

    function goBack() {
        resetForm();
        setMode("search");
    }

    // On ne ferme pas la fenêtre pendant un envoi
    function closeModal() {
        if (saving) {
            return;
        }
        onClose();
    }

    // Erreurs de saisie : affichées seulement après un premier clic sur le bouton
    let nameError = "";
    let priceError = "";
    let durationError = "";
    if (submitted) {
        priceError = getPriceError(priceText);
        durationError = getDurationError(durationText);
        if (mode === "create") {
            nameError = getNameError(nameInput);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setSubmitted(true);

        // S'il reste une erreur de saisie, on n'envoie rien au backend
        let hasFormError = false;
        if (getPriceError(priceText) !== "" || getDurationError(durationText) !== "") {
            hasFormError = true;
        }
        if (mode === "create" && getNameError(nameInput) !== "") {
            hasFormError = true;
        }
        if (hasFormError) {
            return;
        }

        const price = parseNumber(priceText);
        const duration = parseNumber(durationText);
        if (price === null || duration === null) {
            return;
        }

        setSaving(true);

        try {
            if (mode === "propose" && selected !== null) {
                const body: SetOfferInput = { customPrice: price, customDuration: duration };
                const offer = await apiPut<Offer>("/api/professionals/me/services/" + selected.id, body);
                onSaved(offer, "Service ajouté à vos services");
                return;
            }

            if (mode === "create") {
                const body: CreateServiceInput = {
                    name: nameInput.trim(),
                    description: emptyToNull(descriptionInput),
                    duration: duration,
                    price: price,
                };
                const offer = await apiPost<Offer>("/api/services", body);
                onSaved(offer, "Service créé et ajouté à vos services");
                return;
            }
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                // Pour un doublon (409), le backend met des détails techniques : on ne les montre pas
                if (error.statusCode !== 409) {
                    setErrorDetails(error.details);
                }
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSaving(false);
    }

    // Le titre et le texte du bouton changent selon l'écran
    let title = "Ajouter un service";
    if (mode === "propose") {
        title = "Proposer ce service";
    } else if (mode === "create") {
        title = "Créer un nouveau service";
    }

    let submitLabel = "Ajouter à mes services";
    if (mode === "create") {
        submitLabel = "Créer le service";
    }
    if (saving) {
        submitLabel = "Enregistrement...";
    }

    return (
        // allowOverflow : sur l'écran de recherche, le panneau flottant peut dépasser de la fenêtre
        <Modal open={true} title={title} onClose={closeModal} allowOverflow={mode === "search"}>
            {/* Écran 1 : recherche */}
            {mode === "search" && (
                <div>
                    <p className="mb-3 text-sm text-muted">
                        Tapez le nom du service : nous vérifions s&apos;il existe déjà.
                    </p>

                    {/* relative = repère de position pour le panneau flottant plus bas */}
                    <div className="relative">
                        <Input
                            label="Nom du service"
                            placeholder="Ex. Consultation générale"
                            value={query}
                            onChange={setQuery}
                        />

                        {hasQuery && (
                            // absolute top-full : le panneau est accroché juste sous le champ et flotte
                            // par-dessus le reste : la fenêtre ne change jamais de taille.
                            // h-60 = hauteur FIXE : le panneau ne grandit ni ne rétrécit selon le contenu.
                            <div className="absolute top-full right-0 left-0 z-20 mt-1 flex h-60 flex-col overflow-hidden rounded-lg border border-line bg-white shadow-lg">
                                {/* Le centre : « Recherche... », ou la liste (qui défile), ou un message */}
                                <div className="flex-1 overflow-y-auto p-3">
                                    {showWaiting && (
                                        <div className="flex h-full items-center justify-center">
                                            <LottieLoader kind="search" tone="pro" size={110} label="Recherche..." />
                                        </div>
                                    )}

                                    {showList && (
                                        <ul className="space-y-2">
                                            {/* map = une ligne par suggestion */}
                                            {suggestions.map((suggestion) => {
                                                const offered = isAlreadyOffered(suggestion.id);

                                                let itemClass = "hover:bg-tint";
                                                if (offered) {
                                                    itemClass = "cursor-not-allowed opacity-60";
                                                }

                                                let hint =
                                                    "Habituellement " +
                                                    formatPrice(suggestion.price) +
                                                    " · " +
                                                    formatDuration(suggestion.duration);
                                                if (offered) {
                                                    hint = "Déjà dans vos services";
                                                }

                                                return (
                                                    <li key={suggestion.id}>
                                                        <button
                                                            type="button"
                                                            disabled={offered}
                                                            onClick={() => startPropose(suggestion)}
                                                            className={
                                                                "block w-full rounded-lg border border-line p-2.5 text-left " +
                                                                itemClass
                                                            }
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <span className="font-medium text-ink">{suggestion.name}</span>
                                                                {suggestion.exact && (
                                                                    <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-medium text-primary">
                                                                        Identique
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {suggestion.description !== null && (
                                                                <span className="mt-0.5 line-clamp-1 block text-sm text-muted">
                                                                    {suggestion.description}
                                                                </span>
                                                            )}
                                                            <span className="mt-1 block text-xs text-muted">{hint}</span>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}

                                    {showError && <ErrorMessage message={searchError} details={[]} isDisplay={isdisplay}/>}

                                    {showNoResult && (
                                        <div className="flex h-full items-center justify-center px-2 text-center text-sm break-words text-muted">
                                            Aucun service ne ressemble à « {searchText} ».
                                        </div>
                                    )}
                                </div>

                                {/* Le bas : créer un nouveau service (hauteur fixe, vide pendant la frappe) */}
                                <div className="h-14 shrink-0 border-t border-line p-2">
                                    {settled && searchError === "" && hasExact && (
                                        <p className="flex h-full items-center px-1 text-xs text-ink">
                                            Ce service existe déjà : choisissez-le dans la liste.
                                        </p>
                                    )}
                                    {settled && searchError === "" && hasExact === false && (
                                        <Button variant="secondary" onClick={startCreate}>
                                            Créer un nouveau service
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 flex justify-end">
                        <Button variant="secondary" fullWidth={false} onClick={closeModal}>
                            Annuler
                        </Button>
                    </div>
                </div>
            )}

            {/* Écrans 2 et 3 : prix et durée (et nom si on crée) */}
            {mode !== "search" && (
                <form onSubmit={handleSubmit} noValidate>
                    <ErrorMessage message={errorMessage} details={errorDetails} isDisplay={isdisplay}/>

                    {mode === "propose" && selected !== null && (
                        <div className="mb-4 rounded-lg bg-tint p-3">
                            <p className="font-medium text-ink">{selected.name}</p>
                            {selected.description !== null && (
                                <p className="mt-0.5 text-sm text-muted">{selected.description}</p>
                            )}
                            <p className="mt-1 text-xs text-muted">
                                Indication (valeurs habituelles) : {formatPrice(selected.price)} ·{" "}
                                {formatDuration(selected.duration)}. Fixez maintenant les vôtres.
                            </p>
                        </div>
                    )}

                    {mode === "create" && (
                        <div>
                            <Input
                                label="Nom du service"
                                value={nameInput}
                                onChange={setNameInput}
                                error={nameError}
                                maxLength={NAME_MAX}
                            />
                            <Textarea
                                label="Description (facultative)"
                                rows={3}
                                value={descriptionInput}
                                onChange={setDescriptionInput}
                                maxLength={DESCRIPTION_MAX}
                            />
                        </div>
                    )}

                    <PriceDurationFields
                        priceText={priceText}
                        onPriceChange={setPriceText}
                        priceError={priceError}
                        pricePlaceholder={selected !== null && mode === "propose" ? String(selected.price) : ""}
                        durationText={durationText}
                        onDurationChange={setDurationText}
                        durationError={durationError}
                        durationPlaceholder={
                            selected !== null && mode === "propose" ? String(selected.duration) : ""
                        }
                    />

                    <div className="flex justify-between gap-3">
                        <Button variant="secondary" fullWidth={false} onClick={goBack} disabled={saving}>
                            <span className="flex items-center gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                Retour
                            </span>
                        </Button>
                        <Button type="submit" fullWidth={false} loading={saving}>
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}