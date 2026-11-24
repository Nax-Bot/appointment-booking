import Link from "next/link";
import { XCircle } from "lucide-react";

// Page où Papi renvoie le client après le paiement.
// À indiquer dans le .env du backend : PAYMENT_FAILURE_URL=https://votre-site/payment/failure
// Elle sert seulement à informer : la vraie confirmation vient de Papi, côté backend.
export default function PaymentFailurePage() {
    return (
        <div className="mx-auto max-w-md py-16 text-center animate-pop-in">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle className="h-8 w-8" />
            </span>
            <h1 className="text-2xl font-bold text-ink">Paiement non abouti</h1>
            <p className="mt-2 text-muted">Le paiement n'a pas été effectué. Votre créneau reste réservé pendant une heure : vous pouvez réessayer depuis « Mes rendez-vous ».</p>
            <Link
                href="/appointments"
                className="mt-6 inline-block rounded-full bg-primary px-5 py-2 font-medium text-white transition-all hover:bg-primary-hover active:scale-95"
            >
                Voir mes rendez-vous
            </Link>
        </div>
    );
}
