"use client";

import { SubmitEvent, useState } from "react";
import { apiPost, apiPut, ApiError } from "@/lib/lib-front/api-client";
import { Unavailability, UnavailabilityInput } from "@/types/api";
import {
    REASON_MAX,
    getPeriodError,
    getReasonError,
    getRequiredDateError,
    getRequiredTimeError,
} from "@/lib/lib-front/unavailability-validation";
import { addDays, getAbsenceParts, localToIso } from "@/lib/lib-front/unavailability-format";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";

// Un motif vide doit être envoyé au backend sous la forme null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") {
        return null;
    }
    return trimmed;
}

// item = l'absence à modifier, ou null pour en ajouter une nouvelle
// onSaved = appelée quand l'enregistrement a réussi (la page ferme alors la fenêtre)
// initial = valeurs proposées au départ pour un AJOUT (par exemple quand on clique dans le calendrier)
export interface UnavailabilityInitial {
    allDay: boolean;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
}

interface UnavailabilityModalProps {
    item: Unavailability | null;
    initial?: UnavailabilityInitial;
    onClose: () => void;
    onSaved: (item: Unavailability, message: string) => void;
}

export default function UnavailabilityModal({ item, initial, onClose, onSaved }: UnavailabilityModalProps) {
    // Les valeurs de départ. Pour un ajout : journées entières cochées, champs vides.
    // Pour une modification : l'absence reconvertie en heure de Madagascar.
    let initialAllDay = true;
    let initialStartDate = "";
    let initialStartTime = "";
    let initialEndDate = "";
    let initialEndTime = "";
    let initialReason = "";
    if (item !== null) {
        const parts = getAbsenceParts(item);
        initialAllDay = parts.allDay;
        initialStartDate = parts.startDate;
        if (parts.allDay) {
            // Pour des journées entières, la date de fin affichée est le dernier jour inclus
            initialEndDate = parts.lastDay;
        } else {
            initialStartTime = parts.startTime;
            initialEndDate = parts.endDate;
            initialEndTime = parts.endTime;
        }
        if (item.reason !== null) {
            initialReason = item.reason;
        }
    } else if (initial !== undefined) {
        initialAllDay = initial.allDay;
        initialStartDate = initial.startDate;
        initialEndDate = initial.endDate;
        initialStartTime = initial.startTime;
        initialEndTime = initial.endTime;
    }

    const [allDay, setAllDay] = useState(initialAllDay);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [startTime, setStartTime] = useState(initialStartTime);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [reason, setReason] = useState(initialReason);
    const [submitted, setSubmitted] = useState(false); // a-t-on déjà cliqué sur le bouton ?

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    // On ne ferme pas la fenêtre pendant un envoi
    function closeModal() {
        if (saving) {
            return;
        }
        onClose();
    }

    // Toutes les erreurs de saisie, calculées d'un coup
    function computeErrors() {
        let startDateError = getRequiredDateError("La date de début", startDate);
        let endDateError = getRequiredDateError("La date de fin", endDate);
        let startTimeError = "";
        let endTimeError = "";
        if (allDay === false) {
            startTimeError = getRequiredTimeError("L'heure de début", startTime);
            endTimeError = getRequiredTimeError("L'heure de fin", endTime);
        }

        // Si les deux dates sont correctes, on vérifie que la fin est après le début
        const periodError = getPeriodError(allDay, startDate, startTime, endDate, endTime);
        if (endDateError === "" && startDateError === "") {
            endDateError = periodError;
        }

        return {
            startDateError: startDateError,
            endDateError: endDateError,
            startTimeError: startTimeError,
            endTimeError: endTimeError,
            reasonError: getReasonError(reason),
        };
    }

    const errors = computeErrors();

    // Les erreurs ne s'affichent qu'après un premier clic sur le bouton
    let startDateShown = "";
    let endDateShown = "";
    let startTimeShown = "";
    let endTimeShown = "";
    let reasonShown = "";
    if (submitted) {
        startDateShown = errors.startDateError;
        endDateShown = errors.endDateError;
        startTimeShown = errors.startTimeError;
        endTimeShown = errors.endTimeError;
        reasonShown = errors.reasonError;
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setSubmitted(true);

        // S'il reste une erreur de saisie, on n'envoie rien au backend
        const hasFormError =
            errors.startDateError !== "" ||
            errors.endDateError !== "" ||
            errors.startTimeError !== "" ||
            errors.endTimeError !== "" ||
            errors.reasonError !== "";
        if (hasFormError) {
            return;
        }

        // Date et heure saisies (heure de Madagascar) -> instants UTC pour le backend
        let startIso = "";
        let endIso = "";
        if (allDay) {
            // De minuit le premier jour jusqu'à minuit le lendemain du dernier jour
            startIso = localToIso(startDate, "00:00");
            endIso = localToIso(addDays(endDate, 1), "00:00");
        } else {
            startIso = localToIso(startDate, startTime);
            endIso = localToIso(endDate, endTime);
        }

        const body: UnavailabilityInput = {
            startDatetime: startIso,
            endDatetime: endIso,
            reason: emptyToNull(reason),
        };

        setSaving(true);

        try {
            if (item === null) {
                const created = await apiPost<Unavailability>(
                    "/api/professionals/me/unavailabilities",
                    body
                );
                onSaved(created, "Absence ajoutée");
            } else {
                const updated = await apiPut<Unavailability>(
                    "/api/professionals/me/unavailabilities/" + item.id,
                    body
                );
                onSaved(updated, "Absence modifiée");
            }
            return;
        } catch (error) {
            if (error instanceof ApiError) {
                // Par exemple 409 : « Cette période chevauche une autre indisponibilité »
                setErrorMessage(error.message);
                setErrorDetails(error.details);
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSaving(false);
    }

    let title = "Ajouter une absence";
    let submitLabel = "Ajouter";
    if (item !== null) {
        title = "Modifier l'absence";
        submitLabel = "Enregistrer";
    }
    if (saving) {
        submitLabel = "Enregistrement...";
    }

    return (
        <Modal open={true} title={title} onClose={closeModal}>
            <form onSubmit={handleSubmit} noValidate>
                <ErrorMessage message={errorMessage} details={errorDetails} />

                <p className="mb-3 text-sm text-muted">
                    Pendant une absence, aucun créneau n&apos;est proposé aux clients. Les heures
                    sont en heure locale de Madagascar.
                </p>

                <Checkbox label="Journée(s) entière(s)" checked={allDay} onChange={setAllDay} />

                {allDay ? (
                    <div className="grid gap-x-4 sm:grid-cols-2">
                        <Input
                            label="Du"
                            type="date"
                            value={startDate}
                            onChange={setStartDate}
                            error={startDateShown}
                        />
                        <Input
                            label="Au (jour inclus)"
                            type="date"
                            value={endDate}
                            onChange={setEndDate}
                            error={endDateShown}
                        />
                    </div>
                ) : (
                    <div className="grid gap-x-4 sm:grid-cols-2">
                        <Input
                            label="Date de début"
                            type="date"
                            value={startDate}
                            onChange={setStartDate}
                            error={startDateShown}
                        />
                        <Input
                            label="Heure de début"
                            type="time"
                            value={startTime}
                            onChange={setStartTime}
                            error={startTimeShown}
                        />
                        <Input
                            label="Date de fin"
                            type="date"
                            value={endDate}
                            onChange={setEndDate}
                            error={endDateShown}
                        />
                        <Input
                            label="Heure de fin"
                            type="time"
                            value={endTime}
                            onChange={setEndTime}
                            error={endTimeShown}
                        />
                    </div>
                )}

                <Input
                    label="Motif (facultatif)"
                    placeholder="Ex. Congé, formation"
                    value={reason}
                    onChange={setReason}
                    error={reasonShown}
                    maxLength={REASON_MAX}
                />

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" fullWidth={false} onClick={closeModal} disabled={saving}>
                        Annuler
                    </Button>
                    <Button type="submit" fullWidth={false} loading={saving}>
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}