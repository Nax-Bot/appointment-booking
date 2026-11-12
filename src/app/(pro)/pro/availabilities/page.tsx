"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, ApiError } from "@/lib/lib-front/api-client";
import { Availability } from "@/types/api";
import { getDayName } from "@/lib/lib-front/days";
import { formatValidity } from "@/lib/lib-front/format";
import {
    AvailabilityGroup,
    describeGroup,
    formatDays,
    groupAvailabilities,
} from "@/lib/lib-front/availability-groups";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import AvailabilityModal, { SaveResult } from "@/components/availability/AvailabilityModal";

// Un bandeau rouge : un message et, en dessous, la liste de ce qui a été refusé
interface Warning {
    message: string;
    details: string[];
}

export default function ProAvailabilitiesPage() {
    // Mes plages horaires, telles que le backend me les renvoie (une par jour)
    const [items, setItems] = useState<Availability[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [warning, setWarning] = useState<Warning | null>(null);

    // La fenêtre d'ajout / modification : ouverte ou non, et quelle carte on modifie
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AvailabilityGroup | null>(null);

    // La confirmation de suppression d'une carte
    const [removing, setRemoving] = useState<AvailabilityGroup | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState("");

    const [isdisplay,setIsdisplay] = useState(true);

    // Au premier affichage : on lit mes plages dans le backend
    useEffect(() => {
        async function loadItems() {
            try {
                const loaded = await apiGet<Availability[]>("/api/professionals/me/availabilities");
                setItems(loaded);
            } catch (error) {
                if (error instanceof ApiError) {
                    setLoadError(error.message);
                } else {
                    setLoadError("Impossible de charger vos horaires");
                }
            }
            setLoading(false);
        }

        loadItems();
    }, []);

    // Après chaque enregistrement ou suppression, on relit la liste dans le backend :
    // l'écran montre toujours la réalité, même si une partie des requêtes a échoué.
    async function reloadItems() {
        try {
            const loaded = await apiGet<Availability[]>("/api/professionals/me/availabilities");
            setItems(loaded);
        } catch {
            setWarning({
                message: "La liste n'a pas pu être rafraîchie : rechargez la page.",
                details: [],
            });
        }
    }

    // Les cartes : les plages qui ont les mêmes heures et la même période sont regroupées
    const groups = groupAvailabilities(items);

    // Appelée par la fenêtre quand l'enregistrement est terminé
    async function handleDone(result: SaveResult) {
        setModalOpen(false);
        setEditingGroup(null);
        await reloadItems();

        if (result.failures.length === 0) {
            setSuccessMessage(result.summary);
        } else {
            setSuccessMessage("");
            setWarning({
                message:
                    "Enregistrement partiel (" + result.summary + "). Ces jours n'ont pas pu être enregistrés :",
                details: result.failures,
            });
        }
    }

    function openAdd() {
        setSuccessMessage("");
        setWarning(null);
        setEditingGroup(null);
        setModalOpen(true);
    }

    function openEdit(group: AvailabilityGroup) {
        setSuccessMessage("");
        setWarning(null);
        setEditingGroup(group);
        setModalOpen(true);
    }

    function openRemove(group: AvailabilityGroup) {
        setSuccessMessage("");
        setWarning(null);
        setRemoveError("");
        setRemoving(group);
    }

    function closeRemove() {
        if (removeBusy) {
            return;
        }
        setRemoving(null);
    }

    // Supprime toutes les plages de la carte, une requête par jour
    async function confirmRemove() {
        if (removing === null) {
            return;
        }

        setRemoveBusy(true);
        setRemoveError("");

        let removedCount = 0;
        const failures: string[] = [];

        for (const item of removing.items) {
            try {
                await apiDelete<unknown>("/api/professionals/me/availabilities/" + item.id);
                removedCount = removedCount + 1;
            } catch (error) {
                let message = "Erreur inattendue";
                if (error instanceof ApiError) {
                    message = error.message;
                }
                failures.push(getDayName(item.dayOfWeek) + " : " + message);
            }
        }

        // Aucune suppression n'a eu lieu : rien à recharger
        if (removedCount > 0) {
            await reloadItems();
        }

        if (failures.length === 0) {
            let summary = removedCount + " plages supprimées";
            if (removedCount === 1) {
                summary = "Plage horaire supprimée";
            }
            setSuccessMessage(summary);
            setRemoving(null);
        } else if (removedCount === 0) {
            // Rien n'a été supprimé : la fenêtre reste ouverte avec le motif
            setRemoveError(failures[0]);
        } else {
            setRemoving(null);
            setWarning({
                message:
                    "Suppression partielle (" +
                    removedCount +
                    " supprimée(s)). Ces jours n'ont pas pu être supprimés :",
                details: failures,
            });
        }

        setRemoveBusy(false);
    }

    if (loading === true) {
        return <PageLoading kind="clock" label="Chargement de vos horaires..." />;
    }

    if (loadError !== "") {
        return <ErrorMessage message={loadError} details={[]} isDisplay={isdisplay}/>;
    }

    return (
        <div>
            {/* Titre, trait et bouton d'ajout */}
            <div className="mb-6 flex items-center gap-4">
                <h1 className="text-2xl font-bold text-ink">Mes horaires</h1>
                <div className="h-px flex-1 bg-line" />
                <Button fullWidth={false} onClick={openAdd}>
                    <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Ajouter une plage
                    </span>
                </Button>
            </div>

            <p className="mb-6 text-sm text-muted">
                Indiquez vos horaires de travail habituels. Les heures sont en heure locale de
                Madagascar. Pour une pause (déjeuner, par exemple), créez deux plages le même jour :
                09:00 – 12:00, puis 14:00 – 18:00.
            </p>

            <SuccessMessage message={successMessage} />
            {warning !== null && <ErrorMessage message={warning.message} details={warning.details} isDisplay={isdisplay}/>}

            {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted" />
                    <p className="font-medium text-ink">Vous n&apos;avez encore aucun horaire.</p>
                    <p className="mt-1 text-sm text-muted">
                        Tant que ce n&apos;est pas fait, aucun client ne peut réserver de créneau chez vous.
                    </p>
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {/* map = une carte par groupe de plages */}
                    {groups.map((group) => {
                        // Sans dates, la plage est valable sans limite
                        let validity = formatValidity(group.validFrom, group.validTo);
                        if (validity === "") {
                            validity = "Sans limite de dates";
                        }

                        // « Lun – Jeu », ou « Chaque lundi » quand il n'y a qu'un seul jour
                        let daysLabel = formatDays(group.days);
                        if (group.days.length === 1) {
                            daysLabel = "Chaque " + getDayName(group.days[0]).toLowerCase();
                        }

                        return (
                            <li
                                key={group.key}
                                className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm"
                            >
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold text-ink">
                                        {group.startTime} – {group.endTime}
                                    </p>
                                    <span className="mt-2 inline-block rounded-full bg-tint px-2.5 py-1 text-sm font-medium text-primary">
                                        {daysLabel}
                                    </span>
                                    <p className="mt-2 text-sm text-muted">{validity}</p>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(group)}
                                        aria-label={"Modifier la plage " + describeGroup(group)}
                                        className="rounded-lg p-2 text-muted hover:bg-tint hover:text-ink"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openRemove(group)}
                                        aria-label={"Supprimer la plage " + describeGroup(group)}
                                        className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* La fenêtre d'ajout / modification : créée à l'ouverture, supprimée à la fermeture,
          donc ses champs repartent toujours des bonnes valeurs. */}
            {modalOpen && (
                <AvailabilityModal
                    group={editingGroup}
                    onClose={() => setModalOpen(false)}
                    onDone={handleDone}
                />
            )}

            {/* La confirmation de suppression */}
            <Modal open={removing !== null} title="Supprimer cette plage ?" onClose={closeRemove}>
                {removing !== null && (
                    <div>
                        <p className="mb-2 text-ink">
                            Voulez-vous supprimer la plage « {describeGroup(removing)} » ?
                        </p>
                        <p className="mb-4 text-sm text-muted">
                            {removing.items.length > 1
                                ? "Cela supprime " + removing.items.length + " plages (une par jour). "
                                : ""}
                            Les clients ne pourront plus réserver sur cette plage. Les rendez-vous déjà pris ne
                            sont pas modifiés.
                        </p>

                        <ErrorMessage message={removeError} details={[]} isDisplay={isdisplay}/>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                fullWidth={false}
                                onClick={closeRemove}
                                disabled={removeBusy}
                            >
                                Annuler
                            </Button>
                            <Button variant="danger" fullWidth={false} onClick={confirmRemove} loading={removeBusy}>
                                {removeBusy ? "Suppression..." : "Supprimer"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}