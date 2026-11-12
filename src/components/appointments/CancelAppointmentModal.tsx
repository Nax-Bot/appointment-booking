"use client";

import { useState } from "react";
import { apiPost, ApiError } from "@/lib/lib-front/api-client";
import { Role } from "@/types/api";
import { AppointmentDetail, CancelAppointmentInput } from "@/types/booking";
import { formatLongDate, toLocalParts } from "@/lib/lib-front/unavailability-format";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";

const REASON_MAX = 255;

// Un motif vide doit être envoyé au backend sous la forme null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") {
        return null;
    }
    return trimmed;
}

// item = le rendez-vous à annuler
// onCancelled = appelée quand l'annulation a réussi (la page ferme alors la fenêtre)
// onStale = appelée quand le backend refuse : la liste affichée est périmée, la page la recharge
interface CancelAppointmentModalProps {
    item: AppointmentDetail;
    role: Role;
    onClose: () => void;
    onCancelled: () => void;
    onStale: () => void;
}

export default function CancelAppointmentModal({
    item,
    role,
    onClose,
    onCancelled,
    onStale,
}: CancelAppointmentModalProps) {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const start = toLocalParts(item.startDatetime);
    const end = toLocalParts(item.endDatetime);

    // On ne ferme pas la fenêtre pendant un envoi
    function closeModal() {
        if (saving) {
            return;
        }
        onClose();
    }

    let reasonError = "";
    if (reason.trim().length > REASON_MAX) {
        reasonError = "Le motif est trop long (255 caractères maximum)";
    }

    // Ce que la personne doit savoir avant d'annuler
    let notice = "Le professionnel ne sera pas prévenu automatiquement : les messages seront ajoutés plus tard.";
    if (role === "PROFESSIONAL") {
        notice = "Le client ne sera pas prévenu automatiquement : les messages seront ajoutés plus tard.";
    }

    async function handleConfirm() {
        if (reasonError !== "") {
            return;
        }

        setErrorMessage("");
        setSaving(true);

        const body: CancelAppointmentInput = { reason: emptyToNull(reason) };

        try {
            await apiPost<AppointmentDetail>("/api/appointments/" + item.id + "/cancel", body);
            onCancelled();
            return;
        } catch (error) {
            if (error instanceof ApiError) {
                // Par exemple 409 : « Un rendez-vous déjà commencé ne peut pas être annulé ».
                // Le backend a raison : on affiche son message et on recharge la liste.
                setErrorMessage(error.message);
                onStale();
            } else {
                setErrorMessage("Erreur inattendue");
            }
        }

        setSaving(false);
    }

    return (
        <Modal open={true} title="Annuler ce rendez-vous ?" onClose={closeModal}>
            <ErrorMessage message={errorMessage} details={[]} />

            <div className="mb-4 rounded-lg bg-tint p-3">
                <p className="font-semibold text-ink">{item.service.name}</p>
                <p className="mt-1 text-sm text-ink">
                    {formatLongDate(start.dateText)}, de {start.timeText} à {end.timeText}
                </p>
            </div>

            <p className="mb-4 text-sm text-muted">
                Le créneau sera de nouveau proposé aux autres clients. {notice}
            </p>

            <Textarea
                label="Motif (facultatif)"
                rows={3}
                value={reason}
                onChange={setReason}
                error={reasonError}
                maxLength={REASON_MAX}
            />

            <div className="flex justify-end gap-3">
                <Button variant="secondary" fullWidth={false} onClick={closeModal} disabled={saving}>
                    Garder le rendez-vous
                </Button>
                <Button variant="danger" fullWidth={false} onClick={handleConfirm} loading={saving}>
                    {saving ? "Annulation..." : "Annuler le rendez-vous"}
                </Button>
            </div>
        </Modal>
    );
}