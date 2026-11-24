import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

// Page où Papi renvoie le client après le paiement.
// À indiquer dans le .env du backend : PAYMENT_SUCCESS_URL=https://votre-site/payment/success
// Elle sert seulement à informer : la vraie confirmation vient de Papi, côté backend.
export default function PaymentSuccessPage() {
    return (
        <div className="mx-auto max-w-md py-16 text-center animate-pop-in">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tint text-primary">
                <CheckCircle2 className="h-8 w-8" />
            </span>
            <h1 className="text-2xl font-bold text-ink">Paiement reçu</h1>
            <p className="mt-2 text-muted">Merci ! Votre rendez-vous sera confirmé dans quelques instants, dès que le paiement est validé. Vous recevrez un e-mail.</p>
            <Link
                href="/appointments"
                className="mt-6 inline-block rounded-full bg-primary px-5 py-2 font-medium text-white transition-all hover:bg-primary-hover active:scale-95"
            >
                Voir mes rendez-vous
            </Link>
        </div>
    );
}
