"use client";

import { SubmitEvent, useState } from "react";
import { apiDelete, apiPost, apiPut, ApiError } from "@/lib/lib-front/api-client";
import { Availability, AvailabilityInput } from "@/types/api";
import { getDayName, getDayOrder } from "@/lib//lib-front/days";
import { AvailabilityGroup } from "@/lib//lib-front/availability-groups";
import {
    getDateError,
    getEndTimeError,
    getStartTimeError,
    getValidToError,
} from "@/lib//lib-front/availability-validation";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import DayPicker from "@/components/availability/DayPicker";

// Ce que la fenêtre renvoie à la page quand elle a fini :
// summary = « 3 plages ajoutées », failures = une phrase par jour refusé
export interface SaveResult {
    summary: string;
    failures: string[];
}

// Un jour que le backend a refusé, avec son motif
interface DayFailure {
    day: number;
    message: string;
}

// Un champ de date vide doit être envoyé au backend sous la forme null
function emptyToNull(text: string): string | null {
    if (text === "") {
        return null;
    }
    return text;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return error.message;
    }
    return "Erreur inattendue";
}

// Le jour est-il dans la liste ?
function hasDay(days: number[], day: number): boolean {
    for (const item of days) {
        if (item === day) {
            return true;
        }
    }
    return false;
}

// La plage d'un groupe pour un jour donné (null s'il n'y en a pas)
function findItem(items: Availability[], day: number): Availability | null {
    for (const item of items) {
        if (item.dayOfWeek === day) {
            return item;
        }
    }
    return null;
}

// « 3 plages ajoutées, 1 plage modifiée »
function buildSummary(created: number, updated: number, deleted: number): string {
    const pieces: string[] = [];

    if (created > 0) {
        pieces.push(created === 1 ? "1 plage ajoutée" : created + " plages ajoutées");
    }
    if (updated > 0) {
        pieces.push(updated === 1 ? "1 plage modifiée" : updated + " plages modifiées");
    }
    if (deleted > 0) {
        pieces.push(deleted === 1 ? "1 plage supprimée" : deleted + " plages supprimées");
    }

    if (pieces.length === 0) {
        return "Aucune modification";
    }
    return pieces.join(", ");
}

// group = la carte à modifier (toutes ses plages), ou null pour en ajouter
// onDone = appelée quand l'enregistrement est terminé (la page ferme alors la fenêtre)
// initial = valeurs proposées au départ pour un AJOUT (par exemple quand on clique dans le calendrier)
export interface AvailabilityInitial {
    days: number[];
    startTime: string;
    endTime: string;
}

interface AvailabilityModalProps {
    group: AvailabilityGroup | null;
    initial?: AvailabilityInitial;
    onClose: () => void;
    onDone: (result: SaveResult) => void;
}

export default function AvailabilityModal({ group, initial, onClose, onDone }: AvailabilityModalProps) {
    // Les valeurs de départ : celles de la carte si on la modifie, sinon des champs vides
    let initialDays: number[] = [];
    let initialStart = "";
    let initialEnd = "";
    let initialFrom = "";
    let initialTo = "";
    if (group !== null) {
        initialDays = group.days;
        initialStart = group.startTime;
        initialEnd = group.endTime;
        if (group.validFrom !== null) {
            initialFrom = group.validFrom;
        }
        if (group.validTo !== null) {
            initialTo = group.validTo;
        }
    } else if (initial !== undefined) {
        initialDays = initial.days;
        initialStart = initial.startTime;
        initialEnd = initial.endTime;
    }

    const [selectedDays, setSelectedDays] = useState<number[]>(initialDays);
    const [startTime, setStartTime] = useState(initialStart);
    const [endTime, setEndTime] = useState(initialEnd);
    const [validFrom, setValidFrom] = useState(initialFrom);
    const [validTo, setValidTo] = useState(initialTo);
    const [submitted, setSubmitted] = useState(false); // a-t-on déjà cliqué sur le bouton ?

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    const [isdisplay, setIsdisplay] = useState(false);

    // On ne ferme pas la fenêtre pendant un envoi
    function closeModal() {
        if (saving) {
            return;
        }
        onClose();
    }

    // Erreurs de saisie : affichées seulement après un premier clic sur le bouton
    let daysError = "";
    let startError = "";
    let endError = "";
    let fromError = "";
    let toError = "";
    if (submitted) {
        if (selectedDays.length === 0) {
            daysError = "Choisissez au moins un jour";
        }
        startError = getStartTimeError(startTime);
        endError = getEndTimeError(startTime, endTime);
        fromError = getDateError(validFrom);
        toError = getValidToError(validFrom, validTo);
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setErrorDetails([]);
        setSubmitted(true);

        // S'il reste une erreur de saisie, on n'envoie rien au backend
        const hasFormError =
            selectedDays.length === 0 ||
            getStartTimeError(startTime) !== "" ||
            getEndTimeError(startTime, endTime) !== "" ||
            getDateError(validFrom) !== "" ||
            getValidToError(validFrom, validTo) !== "";
        if (hasFormError) {
            return;
        }

        setSaving(true);

        const newFrom = emptyToNull(validFrom);
        const newTo = emptyToNull(validTo);

        const failures: DayFailure[] = [];
        let createdCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;

        // 1. Si on modifie une carte : les jours décochés sont supprimés
        if (group !== null) {
            for (const item of group.items) {
                if (hasDay(selectedDays, item.dayOfWeek) === false) {
                    try {
                        await apiDelete<unknown>("/api/professionals/me/availabilities/" + item.id);
                        deletedCount = deletedCount + 1;
                    } catch (error) {
                        failures.push({ day: item.dayOfWeek, message: getErrorMessage(error) });
                    }
                }
            }
        }

        // 2. Les jours cochés, du lundi au dimanche : on modifie la plage qui existe déjà,
        //    ou on en crée une nouvelle. Une plage inchangée n'envoie aucune requête.
        const sortedDays: number[] = [];
        for (const day of selectedDays) {
            sortedDays.push(day);
        }
        sortedDays.sort((a, b) => getDayOrder(a) - getDayOrder(b));

        for (const day of sortedDays) {
            const body: AvailabilityInput = {
                dayOfWeek: day,
                startTime: startTime,
                endTime: endTime,
                validFrom: newFrom,
                validTo: newTo,
            };

            let existing: Availability | null = null;
            if (group !== null) {
                existing = findItem(group.items, day);
            }

            try {
                if (existing === null) {
                    await apiPost<Availability>("/api/professionals/me/availabilities", body);
                    createdCount = createdCount + 1;
                } else {
                    const isChanged =
                        existing.startTime !== startTime ||
                        existing.endTime !== endTime ||
                        existing.validFrom !== newFrom ||
                        existing.validTo !== newTo;

                    if (isChanged) {
                        await apiPut<Availability>(
                            "/api/professionals/me/availabilities/" + existing.id,
                            body
                        );
                        updatedCount = updatedCount + 1;
                    }
                }
            } catch (error) {
                failures.push({ day: day, message: getErrorMessage(error) });
            }
        }

        const summary = buildSummary(createdCount, updatedCount, deletedCount);
        const changedCount = createdCount + updatedCount + deletedCount;

        // Tout a réussi : la page ferme la fenêtre
        if (failures.length === 0) {
            onDone({ summary: summary, failures: [] });
            return;
        }

        // Rien n'a réussi : la fenêtre reste ouverte pour que la personne corrige
        if (changedCount === 0) {
            if (failures.length === 1) {
                setErrorMessage(failures[0].message);
            } else {
                setErrorMessage("Aucune plage n'a pu être enregistrée");
                const details: string[] = [];
                for (const failure of failures) {
                    details.push(getDayName(failure.day) + " : " + failure.message);
                }
                setErrorDetails(details);
            }
            setSaving(false);
            return;
        }

        // Une partie a réussi : la page ferme la fenêtre et affiche ce qui a été refusé
        const failureTexts: string[] = [];
        for (const failure of failures) {
            failureTexts.push(getDayName(failure.day) + " : " + failure.message);
        }
        onDone({ summary: summary, failures: failureTexts });
    }

    let title = "Ajouter une plage horaire";
    let submitLabel = "Ajouter";
    let hint = "Cochez plusieurs jours pour créer la même plage horaire sur chacun d'eux.";
    if (group !== null) {
        title = "Modifier la plage horaire";
        submitLabel = "Enregistrer";
        hint =
            "La modification s'applique à tous les jours cochés. Décochez un jour pour le retirer, cochez-en un pour l'ajouter.";
    }
    if (saving) {
        submitLabel = "Enregistrement...";
    }

    return (
        <Modal open={true} title={title} onClose={closeModal}>
            <form onSubmit={handleSubmit} noValidate>
                <ErrorMessage message={errorMessage} details={errorDetails}/>

                <p className="mb-3 text-sm text-muted">{hint}</p>

                <DayPicker selectedDays={selectedDays} onChange={setSelectedDays} error={daysError} />

                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Input
                        label="Heure de début"
                        type="time"
                        value={startTime}
                        onChange={setStartTime}
                        error={startError}
                    />
                    <Input
                        label="Heure de fin"
                        type="time"
                        value={endTime}
                        onChange={setEndTime}
                        error={endError}
                    />
                </div>

                <div className="mb-4 rounded-lg bg-tint p-3">
                    <p className="text-sm font-medium text-ink">Période de validité (facultative)</p>
                    <p className="mt-0.5 text-xs text-muted">
                        Laissez vide si cette plage est valable toute l&apos;année. Sinon, indiquez les dates
                        (incluses) entre lesquelles elle s&apos;applique.
                    </p>
                </div>

                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Input
                        label="À partir du"
                        type="date"
                        value={validFrom}
                        onChange={setValidFrom}
                        error={fromError}
                    />
                    <Input
                        label="Jusqu'au"
                        type="date"
                        value={validTo}
                        onChange={setValidTo}
                        error={toError}
                    />
                </div>

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