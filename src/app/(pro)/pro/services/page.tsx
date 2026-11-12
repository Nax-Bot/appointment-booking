"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import { Banknote, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, ApiError } from "@/lib/lib-front/api-client";
import { Offer } from "@/types/api";
import { formatDuration, formatPrice } from "@/lib/lib-front/format";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import AddServiceModal from "@/components/services/AddServiceModal";
import EditOfferModal from "@/components/services/EditOfferModal";

export default function ProServicesPage() {
    // Mes services, tels que le backend me les renvoie
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Les fenêtres : ajout (oui/non), modification (quel service ?), retrait (quel service ?)
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Offer | null>(null);
    const [removing, setRemoving] = useState<Offer | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState("");

    const [isDisplay, setIsDisplay] = useState(false);
    // Au premier affichage : on lit mes services dans le backend
    useEffect(() => {
        async function loadOffers() {
            try {
                const loaded = await apiGet<Offer[]>("/api/professionals/me/services");
                setOffers(loaded);
            } catch (error) {
                if (error instanceof ApiError) {
                    setLoadError(error.message);
                } else {
                    setLoadError("Impossible de charger vos services");
                }
            }
            setLoading(false);
        }

        loadOffers();
    }, []);

    // Appelée par les fenêtres d'ajout et de modification quand l'enregistrement a réussi :
    // on remplace le service s'il est déjà dans la liste, sinon on l'ajoute, puis on trie par nom
    function handleSaved(offer: Offer, message: string) {
        const updated: Offer[] = [];
        let found = false;

        for (const item of offers) {
            if (item.serviceId === offer.serviceId) {
                updated.push(offer);
                found = true;
            } else {
                updated.push(item);
            }
        }
        if (found === false) {
            updated.push(offer);
        }

        updated.sort((a, b) => a.name.localeCompare(b.name, "fr"));

        setOffers(updated);
        setSuccessMessage(message);
        setAddOpen(false);
        setEditing(null);
    }

    function openAdd() {
        setSuccessMessage("");
        setAddOpen(true);
    }

    function openEdit(offer: Offer) {
        setSuccessMessage("");
        setEditing(offer);
    }

    function openRemove(offer: Offer) {
        setSuccessMessage("");
        setRemoveError("");
        setRemoving(offer);
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
            await apiDelete<unknown>("/api/professionals/me/services/" + removing.serviceId);

            // On retire le service de la liste affichée
            const remaining: Offer[] = [];
            for (const item of offers) {
                if (item.serviceId !== removing.serviceId) {
                    remaining.push(item);
                }
            }
            setOffers(remaining);
            setSuccessMessage("Service retiré de vos services");
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

    // Les identifiants des services déjà proposés (pour les griser dans les suggestions)
    const existingServiceIds: number[] = [];
    for (const offer of offers) {
        existingServiceIds.push(offer.serviceId);
    }

    if (loading === true) {
        return <PageLoading kind="list" label="Chargement de vos services..." />;
    }

    if (loadError !== "") {
        return <ErrorMessage message={loadError} details={[]} isDisplay={isDisplay} />;
    }

    return (
        <div>
            {/* Titre, trait et bouton d'ajout */}
            <div className="mb-6 flex items-center gap-4">
                <h1 className="text-2xl font-bold text-ink">Mes services</h1>
                <div className="h-px flex-1 bg-line" />
                <Button fullWidth={false} onClick={openAdd}>
                    <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Ajouter un service
                    </span>
                </Button>
            </div>

            <SuccessMessage message={successMessage} />

            {offers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                    <p className="font-medium text-ink">Vous ne proposez aucun service pour l&apos;instant.</p>
                    <p className="mt-1 text-sm text-muted">
                        Ajoutez un service avec son prix et sa durée : c&apos;est ce que les clients verront.
                    </p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {/* map = une carte par service */}
                    {offers.map((offer) => (
                        <li
                            key={offer.serviceId}
                            className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="text-lg font-semibold text-ink">{offer.name}</p>
                                {offer.description !== null && (
                                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{offer.description}</p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-sm font-medium text-primary">
                                        <Banknote className="h-4 w-4" />
                                        {formatPrice(offer.price)}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-sm font-medium text-primary">
                                        <Clock className="h-4 w-4" />
                                        {formatDuration(offer.duration)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => openEdit(offer)}
                                    className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-tint"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Modifier
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openRemove(offer)}
                                    className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Retirer
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Les fenêtres d'ajout et de modification sont créées à l'ouverture
          et supprimées à la fermeture : leurs champs repartent donc toujours vides. */}
            {addOpen && (
                <AddServiceModal
                    existingServiceIds={existingServiceIds}
                    onClose={() => setAddOpen(false)}
                    onSaved={handleSaved}
                />
            )}

            {editing !== null && (
                <EditOfferModal
                    offer={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* La confirmation de retrait */}
            <Modal open={removing !== null} title="Retirer ce service ?" onClose={closeRemove}>
                {removing !== null && (
                    <div>
                        <p className="mb-2 text-ink">
                            Voulez-vous retirer « {removing.name} » de vos services ?
                        </p>
                        <p className="mb-4 text-sm text-muted">
                            Les clients ne pourront plus le réserver chez vous. Les rendez-vous déjà pris ne
                            sont pas modifiés.
                        </p>

                        <ErrorMessage message={removeError} details={[]} isDisplay={isDisplay} />

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
                                {removeBusy ? "Retrait..." : "Retirer"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}