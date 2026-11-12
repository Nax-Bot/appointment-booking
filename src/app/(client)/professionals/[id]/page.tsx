import { Suspense } from "react";
import PageLoading from "@/components/ui/PageLoading";
import ProfessionalDetail from "@/components/professionals/ProfessionalDetail";

// useSearchParams (qui lit l'adresse) doit être enveloppé dans un Suspense :
// c'est une exigence de Next.js pour construire le site.
export default function ProfessionalDetailPage() {
    return (
        <Suspense fallback={<PageLoading kind="profile" label="Chargement..." tone="client" />}>
            <ProfessionalDetail />
        </Suspense>
    );
}