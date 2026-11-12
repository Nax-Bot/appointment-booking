"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { apiGet, ApiError } from "@/lib/lib-front/api-client";
import { Role } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import AppointmentCard from "@/components/appointments/AppointmentCard";
import CancelAppointmentModal from "@/components/appointments/CancelAppointmentModal";

// Les filtres : la valeur envoyée au backend (?status=) et le texte de la pastille.
// "" = pas de filtre.
const FILTERS = [
    { value: "", label: "Tous" },
    { value: "PENDING", label: "En attente" },
    { value: "CONFIRMED", label: "Confirmés" },
    { value: "CANCELLED", label: "Annulés" },
    { value: "COMPLETED", label: "Terminés" },
    { value: "NO_SHOW", label: "Absents" },
];

// role = le rôle de la personne connectée (la page s'adapte)
interface AppointmentsViewProps {
    role: Role;
}

export default function AppointmentsView({ role }: AppointmentsViewProps) {
    const [statusFilter, setStatusFilter] = useState("");
    // Client : l'onglet affiché (à venir ou passés)
    const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
    const [items, setItems] = useState<AppointmentDetail[]>([]);
    const [loadError, setLoadError] = useState("");
    // Le filtre auquel correspond la liste affichée (null = rien n'est encore chargé).
    // Quand on change de filtre, la liste affichée n'est plus à jour : on n'affiche que « Chargement... ».
    const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
    // On l'augmente de 1 pour recharger la liste (après une annulation, par exemple)
    const [reloadCount, setReloadCount] = useState(0);
    const [successMessage, setSuccessMessage] = useState("");

    // L'instant où la page s'ouvre : sert à séparer les rendez-vous à venir des passés
    const [now] = useState(() => Date.now());

    // La fenêtre d'annulation : quel rendez-vous ?
    const [cancelling, setCancelling] = useState<AppointmentDetail | null>(null);

    // Charge la liste quand le filtre change ou quand on demande un rechargement.
    // L'indicateur « cancelled » évite qu'une réponse en retard remplace une réponse plus récente.
    useEffect(() => {
        let cancelled = false;

        async function loadItems() {
            let url = "/api/appointments";
            if (statusFilter !== "") {
                url = url + "?status=" + statusFilter;
            }

            try {
                const loaded = await apiGet<AppointmentDetail[]>(url);
                if (cancelled === false) {
                    setItems(loaded);
                    setLoadError("");
                }
            } catch (error) {
                if (cancelled === false) {
                    setItems([]);
                    if (error instanceof ApiError) {
                        setLoadError(error.message);
                    } else {
                        setLoadError("Impossible de charger vos rendez-vous");
                    }
                }
            }
            if (cancelled === false) {
                setLoadedStatus(statusFilter);
            }
        }

        loadItems();

        return () => {
            cancelled = true;
        };
    }, [statusFilter, reloadCount]);

    // « settled » = la liste affichée correspond au filtre choisi
    const settled = loadedStatus === statusFilter;

    // À venir ou en cours (fin pas encore passée), et passés.
    // Les dates ISO en UTC se comparent comme du texte.
    const upcoming: AppointmentDetail[] = [];
    const past: AppointmentDetail[] = [];
    for (const item of items) {
        if (new Date(item.endDatetime).getTime() < now) {
            past.push(item);
        } else {
            upcoming.push(item);
        }
    }
    upcoming.sort((a, b) => {
        if (a.startDatetime < b.startDatetime) {
            return -1;
        }
        if (a.startDatetime > b.startDatetime) {
            return 1;
        }
        return 0;
    });
    past.sort((a, b) => {
        if (a.startDatetime < b.startDatetime) {
            return 1;
        }
        if (a.startDatetime > b.startDatetime) {
            return -1;
        }
        return 0;
    });

    // Le bouton « Annuler » n'est proposé que si le rendez-vous est en attente ou confirmé
    // ET pas encore commencé. Le backend reste le juge : il refuserait de toute façon.
    function canCancel(item: AppointmentDetail): boolean {
        const isCancellable = item.status === "PENDING" || item.status === "CONFIRMED";
        return isCancellable && new Date(item.startDatetime).getTime() > now;
    }

    function changeFilter(value: string) {
        setStatusFilter(value);
        setSuccessMessage("");
    }

    function openCancel(item: AppointmentDetail) {
        setSuccessMessage("");
        setCancelling(item);
    }

    // L'annulation a réussi : on ferme la fenêtre et on recharge la liste
    function handleCancelled() {
        setCancelling(null);
        setSuccessMessage("Rendez-vous annulé");
        setReloadCount(reloadCount + 1);
    }

    // Le backend a refusé : on recharge la liste sans fermer la fenêtre
    function handleStale() {
        setReloadCount(reloadCount + 1);
    }

    // Les textes qui changent selon le rôle
    let intro =
        "Retrouvez les rendez-vous que vous avez réservés. La confirmation par le professionnel et le paiement seront ajoutés plus tard.";
    if (role === "PROFESSIONAL") {
        intro =
            "Retrouvez les rendez-vous pris chez vous. Vous ne pouvez pas encore les confirmer : cette fonction sera ajoutée plus tard.";
    }

    let emptyTitle = "Vous n'avez aucun rendez-vous.";
    if (statusFilter !== "") {
        emptyTitle = "Aucun rendez-vous avec ce statut.";
    }

    const isClient = role === "CLIENT";
    // Le client voit un onglet à la fois ; le professionnel voit tout
    const showUpcoming = isClient === false || tab === "upcoming";
    const showPast = isClient === false || tab === "past";

    return (
        <div>
            {isClient ? (
                <section className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-tint via-white to-white p-6 sm:p-8">
                    <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
                    <h1 className="animate-rise relative text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                        Mes rendez-vous
                    </h1>
                    <p className="animate-rise relative mt-2 max-w-2xl text-sm text-muted" style={{ animationDelay: "60ms" }}>
                        {intro}
                    </p>
                    {/* Les deux onglets, avec leur nombre de rendez-vous */}
                    <div className="animate-rise relative mt-6 inline-flex rounded-full border border-line bg-white p-1 shadow-sm" style={{ animationDelay: "120ms" }}>
                        {(
                            [
                                { value: "upcoming", label: "À venir", count: upcoming.length },
                                { value: "past", label: "Passés", count: past.length },
                            ] as const
                        ).map((item) => {
                            const active = tab === item.value;
                            let tabClass = "text-ink/70 hover:text-ink";
                            if (active) {
                                tabClass = "bg-primary text-white shadow-sm";
                            }
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setTab(item.value)}
                                    className={
                                        "rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-200 " +
                                        tabClass
                                    }
                                >
                                    {item.label}
                                    {settled && (
                                        <span className={"ml-2 text-xs " + (active ? "text-white/80" : "text-muted")}>
                                            {item.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <>
                    {/* Titre suivi d'un trait */}
                    <div className="mb-6 flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-ink">Mes rendez-vous</h1>
                        <div className="h-px flex-1 bg-line" />
                    </div>

                    <p className="mb-6 text-sm text-muted">{intro}</p>
                </>
            )}

            {/* Les pastilles de filtre */}
            <div className="mb-6 flex flex-wrap gap-2">
                {/* map = une pastille par statut */}
                {FILTERS.map((filter) => {
                    const selected = filter.value === statusFilter;

                    let pillClass = "border-line bg-white text-ink hover:bg-tint";
                    if (selected) {
                        pillClass = "border-primary bg-primary text-white";
                    }

                    return (
                        <button
                            key={filter.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => changeFilter(filter.value)}
                            className={
                                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
                                pillClass
                            }
                        >
                            {filter.label}
                        </button>
                    );
                })}
            </div>

            <SuccessMessage message={successMessage} />

            {/* Zone de liste : hauteur minimale, pour que la page ne saute pas */}
            <div className="min-h-64">
                {settled === false && (
                    <PageLoading
                        kind={role === "PROFESSIONAL" ? "people" : "calendar"}
                        label="Chargement de vos rendez-vous..."
                    />
                )}

                {settled && loadError !== "" && <ErrorMessage message={loadError} details={[]} />}

                {settled && loadError === "" && items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                        <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted" />
                        <p className="font-medium text-ink">{emptyTitle}</p>
                        {role === "CLIENT" && statusFilter === "" && (
                            <Link
                                href="/services"
                                className="mt-2 inline-block text-sm font-medium text-primary underline"
                            >
                                Rechercher un service
                            </Link>
                        )}
                        {role === "PROFESSIONAL" && statusFilter === "" && (
                            <p className="mt-1 text-sm text-muted">
                                Les rendez-vous pris par vos clients apparaîtront ici.
                            </p>
                        )}
                    </div>
                )}

                {settled && loadError === "" && items.length > 0 && (
                    <div>
                        {isClient && tab === "upcoming" && upcoming.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                                <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted" />
                                <p className="font-medium text-ink">Aucun rendez-vous à venir.</p>
                                <Link href="/services" className="mt-2 inline-block text-sm font-medium text-primary underline">
                                    Trouver un professionnel
                                </Link>
                            </div>
                        )}
                        {isClient && tab === "past" && past.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                                <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted" />
                                <p className="font-medium text-ink">Aucun rendez-vous passé.</p>
                            </div>
                        )}
                        {showUpcoming && upcoming.length > 0 && (
                            <section className="mb-8">
                                <h2 className={"mb-3 text-sm font-semibold tracking-wide text-muted uppercase " + (isClient ? "hidden" : "")}>
                                    À venir et en cours
                                </h2>
                                <ul className="stagger grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                    {upcoming.map((item) => (
                                        <AppointmentCard
                                            key={item.id}
                                            item={item}
                                            role={role}
                                            muted={item.status === "CANCELLED"}
                                            canCancel={canCancel(item)}
                                            onCancel={openCancel}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}

                        {showPast && past.length > 0 && (
                            <section>
                                <h2 className={"mb-3 text-sm font-semibold tracking-wide text-muted uppercase " + (isClient ? "hidden" : "")}>
                                    Passés
                                </h2>
                                <ul className="stagger grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                                    {past.map((item) => (
                                        <AppointmentCard
                                            key={item.id}
                                            item={item}
                                            role={role}
                                            muted={true}
                                            canCancel={false}
                                            onCancel={openCancel}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* La fenêtre d'annulation : créée à l'ouverture, supprimée à la fermeture */}
            {cancelling !== null && (
                <CancelAppointmentModal
                    item={cancelling}
                    role={role}
                    onClose={() => setCancelling(null)}
                    onCancelled={handleCancelled}
                    onStale={handleStale}
                />
            )}
        </div>
    );
}