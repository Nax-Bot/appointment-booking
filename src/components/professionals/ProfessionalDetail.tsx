"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { apiGet, ApiError } from "@/lib/lib-front/api-client";
import { Professional } from "@/types/api";
import { getInitials } from "@/lib/lib-front/text-helpers";
import ErrorMessage from "@/components/ui/ErrorMessage";
import BookingPanel from "@/components/booking/BookingPanel";

export default function ProfessionalDetail() {
    // Dans l'adresse : /professionals/12?serviceId=3
    const params = useParams<{ id: string }>();
    const id = params.id;
    const searchParams = useSearchParams();
    const serviceId = searchParams.get("serviceId");

    const [professional, setProfessional] = useState<Professional | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // Au premier affichage : on lit le professionnel dans le backend
    useEffect(() => {
        async function loadProfessional() {
            try {
                const loaded = await apiGet<Professional>("/api/professionals/" + id);
                setProfessional(loaded);
            } catch (error) {
                if (error instanceof ApiError) {
                    setLoadError(error.message);
                } else {
                    setLoadError("Impossible de charger ce professionnel");
                }
            }
            setLoading(false);
        }

        loadProfessional();
    }, [id]);

    // Retour à la liste, avec le même service filtré s'il y en avait un
    let backHref = "/services";
    if (serviceId !== null) {
        backHref = "/professionals?serviceId=" + serviceId;
    }

    if (loading === true) {
        return <PageLoading kind="profile" label="Chargement du professionnel..." />;
    }

    return (
        <div>
            <Link
                href={backHref}
                className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour à la recherche
            </Link>

            {loadError !== "" && <ErrorMessage message={loadError} details={[]} />}

            {professional !== null && (
                <div className="space-y-6">
                    {/* En-tête : la carte du professionnel, sur toute la largeur */}
                    <section className="animate-rise overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
                        <div className="relative h-24 bg-gradient-to-br from-primary via-emerald-600 to-teal-500">
                            <div className="pointer-events-none absolute -top-10 -right-6 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                            <div className="pointer-events-none absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-emerald-200/20 blur-2xl" />
                        </div>
                        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-start sm:gap-6">
                            <div className="relative z-10 -mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-primary shadow-md ring-4 ring-white">
                                {getInitials(professional.firstName, professional.lastName)}
                            </div>
                            <div className="min-w-0 flex-1 sm:pt-3">
                                <p className="text-2xl font-bold text-ink">
                                    {professional.firstName} {professional.lastName}
                                </p>
                                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-sm font-medium text-primary">
                                    <Stethoscope className="h-4 w-4" />
                                    {professional.specialty !== null
                                        ? professional.specialty
                                        : "Spécialité non renseignée"}
                                </p>
                                {professional.description !== null && (
                                    <p className="mt-3 max-w-3xl whitespace-pre-line text-ink">{professional.description}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* La réservation : étapes, choix, calendrier */}
                    <BookingPanel
                        professionalId={professional.userId}
                        initialServiceId={serviceId}
                    />
                </div>
            )}
        </div>
    );
}