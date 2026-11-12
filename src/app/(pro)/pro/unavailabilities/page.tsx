"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, ApiError } from "@/lib/lib-front/api-client";
import { Unavailability } from "@/types/api";
import { describeAbsence } from "@/lib/lib-front/unavailability-format";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import UnavailabilityModal from "@/components/unavailability/UnavailabilityModal";

// Une carte d'absence. isPast = true : elle est terminée, on l'affiche en plus pâle.
interface AbsenceCardProps {
    item: Unavailability;
    isPast: boolean;
    onEdit: (item: Unavailability) => void;
    onRemove: (item: Unavailability) => void;
}

function AbsenceCard({ item, isPast, onEdit, onRemove }: AbsenceCardProps) {
    const description = describeAbsence(item);

    let cardClass = "";
    if (isPast) {
        cardClass = "opacity-60";
    }

    return (
        <li
            className={
                "flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-sm " +
                cardClass
            }
        >
            <div className="min-w-0">
                <p className="text-lg font-bold text-ink">{description.title}</p>
                {description.subtitle !== "" && (
                    <p className="text-sm text-muted">{description.subtitle}</p>
                )}
                <span className="mt-2 inline-block rounded-full bg-tint px-2.5 py-1 text-sm font-medium text-primary">
                    {description.badge}
                </span>
                {item.reason !== null && (
                    <p className="mt-2 text-sm break-words text-muted">Motif : {item.reason}</p>
                )}
            </div>

            <div className="flex shrink-0 gap-1">
                <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={"Modifier l'absence : " + description.title}
                    className="rounded-lg p-2 text-muted hover:bg-tint hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => onRemove(item)}
                    aria-label={"Supprimer l'absence : " + description.title}
                    className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </li>
    );
}

export default function ProUnavailabilitiesPage() {
    // Mes absences, telles que le backend me les renvoie
    const [items, setItems] = useState<Unavailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // L'instant où la page s'ouvre : sert à séparer les absences à venir des absences passées
    const [now] = useState(() => Date.now());

    // La fenêtre d'ajout / modification : ouverte ou non, et quelle absence
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Unavailability | null>(null);

    // La confirmation de suppression
    const [removing, setRemoving] = useState<Unavailability | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState("");

    // Au premier affichage : on lit mes absences dans le backend
    useEffect(() => {
        async function loadItems() {
            try {
                const loaded = await apiGet<Unavailability[]>("/api/professionals/me/unavailabilities");
                setItems(loaded);
            } catch (error) {
                if (error instanceof ApiError) {
                    setLoadError(error.message);
                } else {
                    setLoadError("Impossible de charger vos absences");
                }
            }
            setLoading(false);
        }

        loadItems();
    }, []);

    // Les absences à venir ou en cours (de la plus proche à la plus lointaine)
    // et les absences passées (de la plus récente à la plus ancienne).
    // Les dates ISO en UTC se comparent comme du texte.
    const upcoming: Unavailability[] = [];
    const past: Unavailability[] = [];
    for (const item of items) {
        if (new Date(item.endDatetime).getTime() < now) {
            past.push(item);
        } else {
            upcoming.push(item);
        }
    }
    upcoming.sort((a, b) => {
        if (a.startDatetime < b.startDatetime) {
            return -1;
        }
        if (a.startDatetime > b.startDatetime) {
            return 1;
        }
        return 0;
    });
    past.sort((a, b) => {
        if (a.endDatetime < b.endDatetime) {
            return 1;
        }
        if (a.endDatetime > b.endDatetime) {
            return -1;
        }
        return 0;
    });

    // Appelée par la fenêtre quand l'enregistrement a réussi :
    // on remplace l'absence si elle est déjà dans la liste, sinon on l'ajoute
    function handleSaved(item: Unavailability, message: string) {
        const updated: Unavailability[] = [];
        let found = false;

        for (const existing of items) {
            if (existing.id === item.id) {
                updated.push(item);
                found = true;
            } else {
                updated.push(existing);
            }
        }
        if (found === false) {
            updated.push(item);
        }

        setItems(updated);
        setSuccessMessage(message);
        setModalOpen(false);
    }

    function openAdd() {
        setSuccessMessage("");
        setEditing(null);
        setModalOpen(true);
    }

    function openEdit(item: Unavailability) {
        setSuccessMessage("");
        setEditing(item);
        setModalOpen(true);
    }

    function openRemove(item: Unavailability) {
        setSuccessMessage("");
        setRemoveError("");
        setRemoving(item);
    }

    function closeRemove() {
        if (removeBusy) {
            return;
        }
        setRemoving(null);
    }

    async function confirmRemove() {
        if (removing === null) {
            return;
        }

        setRemoveBusy(true);
        setRemoveError("");

        try {
            await apiDelete<unknown>("/api/professionals/me/unavailabilities/" + removing.id);

            // On retire l'absence de la liste affichée
            const remaining: Unavailability[] = [];
            for (const item of items) {
                if (item.id !== removing.id) {
                    remaining.push(item);
                }
            }
            setItems(remaining);
            setSuccessMessage("Absence supprimée");
            setRemoving(null);
        } catch (error) {
            if (error instanceof ApiError) {
                setRemoveError(error.message);
            } else {
                setRemoveError("Erreur inattendue");
            }
        }

        setRemoveBusy(false);
    }

    if (loading === true) {
        return <PageLoading kind="sun" label="Chargement de vos absences..." />;
    }

    if (loadError !== "") {
        return <ErrorMessage message={loadError} details={[]} />;
    }

    return (
        <div>
            {/* Titre, trait et bouton d'ajout */}
            <div className="mb-6 flex items-center gap-4">
                <h1 className="text-2xl font-bold text-ink">Mes absences</h1>
                <div className="h-px flex-1 bg-line" />
                <Button fullWidth={false} onClick={openAdd}>
                    <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Ajouter une absence
                    </span>
                </Button>
            </div>

            <p className="mb-6 text-sm text-muted">
                Déclarez vos congés ou vos formations : pendant une absence, aucun créneau n&apos;est
                proposé aux clients. Les heures sont en heure locale de Madagascar. Les
                rendez-vous déjà pris pendant une absence ne sont pas annulés automatiquement.
            </p>

            <SuccessMessage message={successMessage} />

            {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                    <CalendarOff className="mx-auto mb-3 h-8 w-8 text-muted" />
                    <p className="font-medium text-ink">Vous n&apos;avez déclaré aucune absence.</p>
                    <p className="mt-1 text-sm text-muted">
                        Vos horaires habituels s&apos;appliquent toute l&apos;année.
                    </p>
                </div>
            ) : (
                <div>
                    {upcoming.length > 0 && (
                        <section className="mb-8">
                            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
                                À venir et en cours
                            </h2>
                            <ul className="grid gap-4 sm:grid-cols-2">
                                {upcoming.map((item) => (
                                    <AbsenceCard
                                        key={item.id}
                                        item={item}
                                        isPast={false}
                                        onEdit={openEdit}
                                        onRemove={openRemove}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {past.length > 0 && (
                        <section>
                            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
                                Passées
                            </h2>
                            <ul className="grid gap-4 sm:grid-cols-2">
                                {past.map((item) => (
                                    <AbsenceCard
                                        key={item.id}
                                        item={item}
                                        isPast={true}
                                        onEdit={openEdit}
                                        onRemove={openRemove}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}

            {/* La fenêtre d'ajout / modification : créée à l'ouverture, supprimée à la fermeture,
                donc ses champs repartent toujours des bonnes valeurs. */}
            {modalOpen && (
                <UnavailabilityModal
                    item={editing}
                    onClose={() => setModalOpen(false)}
                    onSaved={handleSaved}
                />
            )}

            {/* La confirmation de suppression */}
            <Modal open={removing !== null} title="Supprimer cette absence ?" onClose={closeRemove}>
                {removing !== null && (
                    <div>
                        <p className="mb-2 text-ink">
                            Voulez-vous supprimer l&apos;absence « {describeAbsence(removing).title} » ?
                        </p>
                        <p className="mb-4 text-sm text-muted">
                            Les clients pourront de nouveau réserver pendant cette période, si vos
                            horaires le permettent.
                        </p>

                        <ErrorMessage message={removeError} details={[]} />

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                fullWidth={false}
                                onClick={closeRemove}
                                disabled={removeBusy}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="danger"
                                fullWidth={false}
                                onClick={confirmRemove}
                                loading={removeBusy}
                            >
                                {removeBusy ? "Suppression..." : "Supprimer"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}