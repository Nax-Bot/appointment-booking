import { Suspense } from "react";
import PageLoading from "@/components/ui/PageLoading";
import ProfessionalsBrowser from "@/components/professionals/ProfessionalsBrowser";

// useSearchParams (qui lit l'adresse) doit être enveloppé dans un Suspense :
// c'est une exigence de Next.js pour construire le site.
export default function ProfessionalsPage() {
    return (
        <Suspense fallback={<PageLoading kind="people" label="Chargement..." tone="client" />}>
            <ProfessionalsBrowser />
        </Suspense>
    );
}