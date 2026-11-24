"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { apiPost, ApiError } from "@/lib/client/api-client";
import { StartPaymentResult } from "@/types/payment";
import Button from "@/components/ui/Button";

// Le bouton « Payer en ligne » d'un rendez-vous en attente.
// Il demande le lien de paiement au backend, puis envoie le client sur la page Papi.
// Si le backend refuse (le professionnel n'a pas de boutique, montant trop faible...),
// son message s'affiche juste sous le bouton.
interface PayButtonProps {
    appointmentId: number;
    label?: string;
    // « compact » : petit bouton de carte ; sinon bouton normal
    compact?: boolean;
}

export default function PayButton({ appointmentId, label = "Payer en ligne", compact = false }: PayButtonProps) {
    const [busy, setBusy] = useState(false);
    const [errorText, setErrorText] = useState("");

    async function handleClick() {
        setErrorText("");
        setBusy(true);
        try {
            const result = await apiPost<StartPaymentResult>("/api/appointments/" + appointmentId + "/pay");
            // On quitte l'application : on laisse le bouton en chargement jusqu'au changement de page
            window.location.href = result.paymentUrl;
        } catch (error) {
            setErrorText(error instanceof ApiError ? error.message : "Erreur inattendue");
            setBusy(false);
        }
    }

    return (
        <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-1.5"}>
            {compact ? (
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-60"
                >
                    <CreditCard className="h-4 w-4" />
                    {busy ? "Redirection..." : label}
                </button>
            ) : (
                <Button fullWidth={false} loading={busy} onClick={handleClick}>
                    <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {label}
                    </span>
                </Button>
            )}
            {errorText !== "" && <p className="max-w-xs text-right text-xs text-red-600">{errorText}</p>}
        </div>
    );
}
