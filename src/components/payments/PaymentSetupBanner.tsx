"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { apiGet } from "@/lib/client/api-client";
import { PaymentAccountStatus } from "@/types/payment";

// Un rappel sur le tableau de bord : « vous n'avez pas encore configuré le paiement en ligne ».
// Il n'apparaît que si le backend répond configured = false (en cas d'erreur, on ne montre rien).
export default function PaymentSetupBanner() {
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        apiGet<PaymentAccountStatus>("/api/professionals/me/payment-account")
            .then((status) => {
                if (cancelled === false && status.configured === false) {
                    setMissing(true);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    if (missing === false) {
        return null;
    }

    return (
        <Link
            href="/pro/profile"
            className="animate-fade-in mb-5 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 transition-colors hover:bg-amber-100"
        >
            <CreditCard className="h-5 w-5 shrink-0" />
            <span>
                <span className="font-semibold">Activez le paiement en ligne.</span> Sans boutique Papi, vos clients ne
                peuvent pas payer et leurs réservations sont libérées au bout d&apos;une heure.
            </span>
        </Link>
    );
}
