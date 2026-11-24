"use client";

import { useState } from "react";
import { CheckCircle2, UserX } from "lucide-react";
import { apiPost, ApiError } from "@/lib/client/api-client";
import { AppointmentDetail } from "@/types/booking";
import { AppointmentOutcome, MarkOutcomeInput } from "@/types/payment";
import Button from "@/components/ui/Button";

// Peut-on clôturer ce rendez-vous ? Il faut qu'il soit confirmé (donc payé) ET déjà commencé.
// Le backend reste le juge : il refuserait de toute façon.
export function canMarkOutcome(item: AppointmentDetail): boolean {
    return item.status === "CONFIRMED" && new Date(item.startDatetime).getTime() <= Date.now();
}

// Les deux boutons du professionnel : « Terminé » et « Client absent ».
// onDone = appelée quand le backend a accepté (la page recharge alors sa liste).
interface OutcomeActionsProps {
    item: AppointmentDetail;
    onDone: () => void;
}

export default function OutcomeActions({ item, onDone }: OutcomeActionsProps) {
    const [busy, setBusy] = useState<AppointmentOutcome | null>(null);
    const [errorText, setErrorText] = useState("");

    async function send(outcome: AppointmentOutcome) {
        setErrorText("");
        setBusy(outcome);
        const body: MarkOutcomeInput = { status: outcome };
        try {
            await apiPost<AppointmentDetail>("/api/appointments/" + item.id + "/outcome", body);
            setBusy(null);
            onDone();
        } catch (error) {
            setErrorText(error instanceof ApiError ? error.message : "Erreur inattendue");
            setBusy(null);
            // Le statut a peut-être changé entre-temps : on recharge pour afficher la vérité
            if (error instanceof ApiError && error.statusCode === 409) {
                onDone();
            }
        }
    }

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center gap-2">
                <Button fullWidth={false} loading={busy === "COMPLETED"} disabled={busy !== null} onClick={() => send("COMPLETED")}>
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Terminé
                    </span>
                </Button>
                <Button
                    variant="secondary"
                    fullWidth={false}
                    loading={busy === "NO_SHOW"}
                    disabled={busy !== null}
                    onClick={() => send("NO_SHOW")}
                >
                    <span className="flex items-center gap-1.5">
                        <UserX className="h-4 w-4" />
                        Client absent
                    </span>
                </Button>
            </div>
            {errorText !== "" && <p className="mt-1.5 text-xs text-red-600">{errorText}</p>}
        </div>
    );
}
