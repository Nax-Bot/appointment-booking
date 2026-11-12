"use client";

import { SubmitEvent, useState } from "react";
import { apiPut, ApiError } from "@/lib/lib-front/api-client";
import { Offer, SetOfferInput } from "@/types/api";
import { getDurationError, getPriceError, parseNumber } from "@/lib/lib-front/offer-validation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PriceDurationFields from "@/components/services/PriceDurationFields";

// offer = le service à modifier
// onSaved = appelée quand la modification a réussi (la page ferme alors la fenêtre)
interface EditOfferModalProps {
    offer: Offer;
    onClose: () => void;
    onSaved: (offer: Offer, message: string) => void;
}

export default function EditOfferModal({ offer, onClose, onSaved }: EditOfferModalProps) {
    // Les champs commencent avec le prix et la durée actuels
    const [priceText, setPriceText] = useState(String(offer.price));
    const [durationText, setDurationText] = useState(String(offer.duration));
    const [submitted, setSubmitted] = useState(false);

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    const [isDisplay, setIsDisplay] = useState(false);

    // On ne ferme pas la fenêtre pendant un envoi
    function closeModal() {
        if (saving) {
            return;
        }
        onClose();
    }

    let priceError = "";
    let durationError = "";
    if (submitted) {
        priceError = getPriceError(priceText);
        durationError = getDurationError(durationText);
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setSubmitted(true);
        setIsDisplay(true);

        // S'il reste une erreur de saisie, on n'envoie rien au backend
        if (getPriceError(priceText) !== "" || getDurationError(durationText) !== "") {
            return;
        }

        const price = parseNumber(priceText);
        const duration = parseNumber(durationText);
        if (price === null || duration === null) {
            return;
        }

        setSaving(true);

        try {
            const body: SetOfferInput = { customPrice: price, customDuration: duration };
            const updated = await apiPut<Offer>("/api/professionals/me/services/" + offer.serviceId, body);
            onSaved(updated, "Service modifié");
            return;
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
                setIsDisplay(true);
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSaving(false);
    }

    return (
        <Modal open={true} title="Modifier mon prix et ma durée" onClose={closeModal}>
            <form onSubmit={handleSubmit} noValidate>
                <ErrorMessage message={errorMessage} details={errorDetails} isDisplay={isDisplay} />

                <div className="mb-4 rounded-lg bg-tint p-3">
                    <p className="font-medium text-ink">{offer.name}</p>
                    <p className="mt-1 text-xs text-muted">
                        Le nom et la description du service sont communs à tous les professionnels : ils ne
                        se modifient pas ici. Seuls votre prix et votre durée changent.
                    </p>
                </div>

                <PriceDurationFields
                    priceText={priceText}
                    onPriceChange={setPriceText}
                    priceError={priceError}
                    durationText={durationText}
                    onDurationChange={setDurationText}
                    durationError={durationError}
                />

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" fullWidth={false} onClick={closeModal} disabled={saving}>
                        Annuler
                    </Button>
                    <Button type="submit" fullWidth={false} loading={saving}>
                        {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}