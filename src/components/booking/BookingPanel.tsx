"use client";

import { useEffect, useState } from "react";
import PageLoading from "@/components/ui/PageLoading";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Banknote, CalendarCheck, Check, Clock } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/lib-front/api-client";
import { Availability, Offer } from "@/types/api";
import { AppointmentItem, CreateAppointmentInput, Slot, SlotsResult } from "@/types/booking";
import { formatDuration, formatPrice } from "@/lib/lib-front/format";
import { getDateError } from "@/lib/lib-front/availability-validation";
import { formatLongDate, toLocalParts } from "@/lib/lib-front/unavailability-format";
import { getStatusLabel, getTodayLocalDate } from "@/lib/lib-front/booking-format";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import BookingStepper, { BookingStep } from "@/components/booking/BookingStepper";
import BookingCalendar from "@/components/booking/BookingCalendar";

const NOTES_MAX = 2000;

// Des notes vides doivent être envoyées au backend sous la forme null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") {
        return null;
    }
    return trimmed;
}

// Le titre d'une étape : un rond numéroté et un texte
function StepTitle({ number, title }: { number: number; title: string }) {
    return (
        <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-xs font-bold text-white shadow-sm ring-4 ring-tint">
                {number}
            </span>
            <h3 className="font-semibold text-ink">{title}</h3>
        </div>
    );
}

// professionalId = le professionnel chez qui on réserve
// initialServiceId = le service présélectionné, lu dans l'adresse (ou null)
interface BookingPanelProps {
    professionalId: number;
    initialServiceId: string | null;
}

export default function BookingPanel({ professionalId, initialServiceId }: BookingPanelProps) {
    // Les services du professionnel
    const [offers, setOffers] = useState<Offer[]>([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [offersError, setOffersError] = useState("");

    // Les choix de la personne (le service est gardé sous forme de texte : "" = aucun)
    const [serviceId, setServiceId] = useState("");
    const [date, setDate] = useState("");
    const [selectedStart, setSelectedStart] = useState("");
    const [notes, setNotes] = useState("");
    // L'étape affichée au milieu quand la personne revient en arrière (null = la première étape à faire)
    const [viewStep, setViewStep] = useState<number | null>(null);
    // Les horaires hebdomadaires du professionnel, pour le mini-calendrier
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);

    // Les créneaux
    const [slotsResult, setSlotsResult] = useState<SlotsResult | null>(null);
    const [slotsError, setSlotsError] = useState("");
    // La « clé » de la recherche à laquelle correspondent les créneaux affichés :
    // elle sert à ne jamais montrer des créneaux qui ne correspondent plus au choix actuel.
    const [loadedKey, setLoadedKey] = useState("");
    // On l'augmente de 1 pour forcer le rechargement des créneaux
    const [reloadCount, setReloadCount] = useState(0);

    // La réservation
    const [saving, setSaving] = useState(false);
    const [bookError, setBookError] = useState("");
    const [bookDetails, setBookDetails] = useState<string[]>([]);
    const [booked, setBooked] = useState<AppointmentItem | null>(null);
    const [bookedServiceName, setBookedServiceName] = useState("");

    // Au premier affichage : on lit les services du professionnel
    useEffect(() => {
        async function loadOffers() {
            try {
                const loaded = await apiGet<Offer[]>(
                    "/api/professionals/" + professionalId + "/services"
                );
                setOffers(loaded);

                // Service présélectionné : celui de l'adresse s'il existe,
                // sinon le seul service s'il n'y en a qu'un
                let preselected = "";
                for (const offer of loaded) {
                    if (initialServiceId !== null && String(offer.serviceId) === initialServiceId) {
                        preselected = String(offer.serviceId);
                    }
                }
                if (preselected === "" && loaded.length === 1) {
                    preselected = String(loaded[0].serviceId);
                }
                setServiceId(preselected);
            } catch (error) {
                if (error instanceof ApiError) {
                    setOffersError(error.message);
                } else {
                    setOffersError("Impossible de charger les services");
                }
            }
            setOffersLoading(false);
        }

        loadOffers();
    }, [professionalId, initialServiceId]);

    // Les horaires de travail du professionnel (le calendrier s'en sert pour griser les jours fermés).
    // En cas d'erreur, le calendrier montre simplement tous les jours comme fermés : la réservation marche quand même.
    useEffect(() => {
        let cancelled = false;
        async function loadAvailabilities() {
            try {
                const loaded = await apiGet<Availability[]>(
                    "/api/professionals/" + professionalId + "/availabilities"
                );
                if (cancelled === false) {
                    setAvailabilities(loaded);
                }
            } catch (error) {
                console.error(error);
            }
        }
        loadAvailabilities();
        return () => {
            cancelled = true;
        };
    }, [professionalId]);

    // Le jour choisi est-il correct ? (format valide, et pas dans le passé)
    const today = getTodayLocalDate();
    let dateError = "";
    if (date !== "") {
        dateError = getDateError(date);
        if (dateError === "" && date < today) {
            dateError = "Choisissez aujourd'hui ou une date à venir";
        }
    }

    // Peut-on chercher des créneaux ? Il faut un service et un jour correct.
    const canLoad = serviceId !== "" && date !== "" && dateError === "";
    const currentKey = serviceId + "|" + date + "|" + reloadCount;
    // « settled » = les créneaux affichés correspondent au choix actuel
    const settled = canLoad && loadedKey === currentKey;

    // Charge les créneaux dès que le service ou le jour change (ce sont des choix, pas de la frappe :
    // pas besoin d'attendre une pause). L'indicateur « cancelled » évite qu'une réponse en retard
    // remplace une réponse plus récente.
    useEffect(() => {
        if (canLoad === false) {
            return undefined;
        }

        let cancelled = false;
        const key = serviceId + "|" + date + "|" + reloadCount;

        async function loadSlots() {
            try {
                const result = await apiGet<SlotsResult>(
                    "/api/professionals/" +
                    professionalId +
                    "/slots?serviceId=" +
                    serviceId +
                    "&date=" +
                    date
                );
                if (cancelled === false) {
                    setSlotsResult(result);
                    setSlotsError("");
                }
            } catch (error) {
                if (cancelled === false) {
                    setSlotsResult(null);
                    if (error instanceof ApiError) {
                        setSlotsError(error.message);
                    } else {
                        setSlotsError("Impossible de charger les créneaux");
                    }
                }
            }
            if (cancelled === false) {
                setLoadedKey(key);
            }
        }

        loadSlots();

        return () => {
            cancelled = true;
        };
    }, [professionalId, serviceId, date, canLoad, reloadCount]);

    // Le service choisi
    let selectedOffer: Offer | null = null;
    for (const offer of offers) {
        if (String(offer.serviceId) === serviceId) {
            selectedOffer = offer;
        }
    }

    // Les créneaux affichés (seulement s'ils sont à jour) et le créneau choisi
    let slots: Slot[] = [];
    if (settled && slotsResult !== null) {
        slots = slotsResult.slots;
    }
    let selectedSlot: Slot | null = null;
    for (const slot of slots) {
        if (slot.startDatetime === selectedStart) {
            selectedSlot = slot;
        }
    }

    function clearBookError() {
        setBookError("");
        setBookDetails([]);
    }

    function chooseService(newServiceId: string) {
        setServiceId(newServiceId);
        setSelectedStart("");
        setViewStep(null);
        clearBookError();
    }

    function chooseDate(newDate: string) {
        setDate(newDate);
        setSelectedStart("");
        setViewStep(null);
        clearBookError();
    }

    function chooseSlot(startDatetime: string) {
        setSelectedStart(startDatetime);
        setViewStep(null);
        clearBookError();
    }

    // Un clic sur un créneau du calendrier : remplit le jour ET l'heure d'un coup
    function chooseSlotFromCalendar(newDate: string, slot: Slot) {
        if (newDate !== date) {
            setDate(newDate);
        }
        setSelectedStart(slot.startDatetime);
        setViewStep(null);
        clearBookError();
    }

    let notesError = "";
    if (notes.trim().length > NOTES_MAX) {
        notesError = "Les notes sont trop longues (2000 caractères maximum)";
    }

    async function handleConfirm() {
        if (selectedSlot === null || selectedOffer === null) {
            return;
        }
        if (notesError !== "") {
            return;
        }

        clearBookError();
        setSaving(true);

        // On renvoie tel quel l'instant UTC du créneau : aucune conversion à faire
        const body: CreateAppointmentInput = {
            professionalId: professionalId,
            serviceId: Number(serviceId),
            startDatetime: selectedSlot.startDatetime,
            notes: emptyToNull(notes),
        };

        try {
            const created = await apiPost<AppointmentItem>("/api/appointments", body);
            setBookedServiceName(selectedOffer.name);
            setBooked(created);
            setNotes("");
            setSelectedStart("");
            // Le créneau réservé ne doit plus être proposé : on recharge la liste
            setReloadCount(reloadCount + 1);
        } catch (error) {
            if (error instanceof ApiError) {
                setBookError(error.message);
                setBookDetails(error.details);
                // Créneau pris entre-temps, hors horaires, absence...: la liste est périmée,
                // on la recharge et on efface le créneau choisi
                if (error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 409) {
                    setSelectedStart("");
                    setReloadCount(reloadCount + 1);
                }
            } else {
                setBookError("Erreur inattendue");
            }
        }

        setSaving(false);
    }

    if (offersLoading === true) {
        return <PageLoading kind="list" label="Chargement des services..." compact />;
    }

    if (offersError !== "") {
        return <ErrorMessage message={offersError} details={[]} />;
    }

    if (offers.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                <p className="font-medium text-ink">
                    Ce professionnel ne propose aucun service pour le moment.
                </p>
                <p className="mt-1 text-sm text-muted">Vous ne pouvez pas réserver chez lui.</p>
            </div>
        );
    }

    // La carte de confirmation, affichée après une réservation réussie
    if (booked !== null) {
        const bookedStart = toLocalParts(booked.startDatetime);
        const bookedEnd = toLocalParts(booked.endDatetime);

        return (
            <section className="animate-pop-in overflow-hidden rounded-3xl border border-primary/40 bg-white shadow-lg shadow-primary/10">
              <div className="bg-gradient-to-br from-tint via-white to-white p-6 pb-2">
                <div className="mb-4 flex items-center gap-3 text-primary">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-md">
                        <CalendarCheck className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-bold">Rendez-vous réservé</h2>
                </div>

                <dl className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-muted">Service</dt>
                        <dd className="font-medium text-ink">{bookedServiceName}</dd>
                    </div>
                    <div>
                        <dt className="text-muted">Jour</dt>
                        <dd className="font-medium text-ink">{formatLongDate(bookedStart.dateText)}</dd>
                    </div>
                    <div>
                        <dt className="text-muted">Heure</dt>
                        <dd className="font-medium text-ink">
                            {bookedStart.timeText} – {bookedEnd.timeText}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted">Prix</dt>
                        <dd className="font-medium text-ink">
                            {booked.priceAtBooking !== null ? formatPrice(booked.priceAtBooking) : "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted">Statut</dt>
                        <dd className="font-medium text-ink">{getStatusLabel(booked.status)}</dd>
                    </div>
                </dl>

                </div>
              <div className="p-6 pt-4">
                <p className="mb-4 rounded-xl bg-tint p-3 text-sm text-ink">
                    Votre rendez-vous est enregistré. La confirmation par le professionnel et le
                    paiement seront ajoutés plus tard.
                </p>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/appointments"
                        className="rounded-full bg-primary px-5 py-2 font-medium text-white transition-all hover:bg-primary-hover active:scale-95"
                    >
                        Voir mes rendez-vous
                    </Link>
                    <Button variant="secondary" fullWidth={false} onClick={() => setBooked(null)}>
                        Réserver un autre rendez-vous
                    </Button>
                </div>
              </div>
            </section>
        );
    }

    // L'étape à faire en premier : la première qui n'est pas encore complète
    let firstIncomplete = 4;
    if (serviceId === "") {
        firstIncomplete = 1;
    } else if (canLoad === false) {
        firstIncomplete = 2;
    } else if (selectedSlot === null) {
        firstIncomplete = 3;
    }
    // L'étape affichée : celle choisie en revenant en arrière, sinon la première à faire
    let currentStep = firstIncomplete;
    if (viewStep !== null && viewStep <= firstIncomplete) {
        currentStep = viewStep;
    }

    function goToStep(step: number) {
        if (step >= firstIncomplete) {
            setViewStep(null);
        } else {
            setViewStep(step);
        }
    }

    const stepTitles = ["Service", "Jour", "Créneau", "Confirmation"];
    const stepSummaries = [
        selectedOffer !== null ? selectedOffer.name : "Choisissez un service",
        canLoad ? formatLongDate(date) : "Choisissez un jour",
        selectedSlot !== null ? selectedSlot.startTime + " – " + selectedSlot.endTime : "Choisissez un créneau",
        "Vérifiez et confirmez",
    ];
    const steps: BookingStep[] = stepTitles.map((title, index) => {
        const number = index + 1;
        let state: BookingStep["state"] = "todo";
        if (number === currentStep) {
            state = "current";
        } else if (number < firstIncomplete) {
            state = "done";
        }
        return {
            title: title,
            summary: stepSummaries[index],
            state: state,
            clickable: number <= firstIncomplete,
        };
    });

    return (
        <section className="animate-rise overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
            <div className="grid lg:grid-cols-[230px_minmax(0,1fr)_350px]">
                {/* Colonne de gauche : les étapes */}
                <div className="border-b border-line bg-gradient-to-br from-tint via-white to-white p-5 lg:border-r lg:border-b-0 lg:p-6">
                    <h2 className="mb-1 hidden text-lg font-bold text-ink lg:block">Réserver</h2>
                    <p className="mb-6 hidden text-xs text-muted lg:block">
                        Suivez les étapes, ou choisissez directement une date et une heure dans le calendrier.
                    </p>
                    <BookingStepper steps={steps} onSelect={(index) => goToStep(index + 1)} />
                </div>

                {/* Colonne du milieu : l'étape en cours */}
                <div className="flex min-w-0 flex-col p-5 sm:p-6">
                    <div key={currentStep} className="animate-fade-in flex-1">
                        {/* Étape 1 : le service */}
                        {currentStep === 1 && (
                            <div>
                                <StepTitle number={1} title="Choisissez un service" />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {/* map = une carte par service du professionnel */}
                                    {offers.map((offer) => {
                                        const selected = String(offer.serviceId) === serviceId;

                                        let cardClass = "border-line hover:-translate-y-0.5 hover:border-primary/50 hover:bg-tint hover:shadow-md";
                                        if (selected) {
                                            cardClass = "border-primary bg-tint shadow-md shadow-primary/10 ring-1 ring-primary";
                                        }

                                        return (
                                            <button
                                                key={offer.serviceId}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() => chooseService(String(offer.serviceId))}
                                                className={"relative rounded-2xl border p-4 text-left transition-all duration-200 " + cardClass}
                                            >
                                                {selected && (
                                                    <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                                        <Check className="h-3 w-3" strokeWidth={3} />
                                                    </span>
                                                )}
                                                <span className="block pr-6 font-semibold text-ink">{offer.name}</span>
                                                {offer.description !== null && (
                                                    <span className="mt-0.5 line-clamp-1 block text-sm text-muted">
                                                        {offer.description}
                                                    </span>
                                                )}
                                                <span className="mt-2 flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-sm font-medium text-primary">
                                                        <Banknote className="h-4 w-4" />
                                                        {formatPrice(offer.price)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-sm font-medium text-primary">
                                                        <Clock className="h-4 w-4" />
                                                        {formatDuration(offer.duration)}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Étape 2 : le jour */}
                        {currentStep === 2 && (
                            <div>
                                <StepTitle number={2} title="Choisissez un jour" />
                                <div className="max-w-xs">
                                    <Input
                                        label="Date du rendez-vous"
                                        type="date"
                                        value={date}
                                        onChange={chooseDate}
                                        error={dateError}
                                    />
                                </div>
                                <p className="text-sm text-muted">
                                    Vous pouvez aussi cliquer sur un jour vert dans le calendrier.
                                </p>
                            </div>
                        )}

                        {/* Étape 3 : le créneau */}
                        {currentStep === 3 && (
                            <div>
                                <StepTitle number={3} title="Choisissez un créneau" />

                                <div className="min-h-24">
                                    {settled === false && (
                                        <PageLoading kind="slots" label="Chargement des créneaux..." size={110} compact />
                                    )}

                                    {settled && slotsError !== "" && (
                                        <ErrorMessage message={slotsError} details={[]} />
                                    )}

                                    {settled && slotsError === "" && slots.length === 0 && (
                                        <p className="py-8 text-center text-sm text-muted">
                                            Aucun créneau libre ce jour-là. Essayez un autre jour.
                                        </p>
                                    )}

                                    {settled && slotsError === "" && slots.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                            {/* map = un bouton par créneau libre */}
                                            {slots.map((slot) => {
                                                const selected = slot.startDatetime === selectedStart;

                                                let slotClass = "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-primary/50 hover:bg-tint";
                                                if (selected) {
                                                    slotClass = "border-primary bg-primary text-white shadow-md shadow-primary/20";
                                                }

                                                return (
                                                    <button
                                                        key={slot.startDatetime}
                                                        type="button"
                                                        aria-pressed={selected}
                                                        title={"Jusqu'à " + slot.endTime}
                                                        onClick={() => chooseSlot(slot.startDatetime)}
                                                        className={
                                                            "rounded-full border px-2 py-2 text-sm font-medium transition-all duration-200 active:scale-95 " +
                                                            slotClass
                                                        }
                                                    >
                                                        {slot.startTime}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Étape 4 : la confirmation */}
                        {currentStep === 4 && selectedSlot !== null && selectedOffer !== null && (
                            <div>
                                <StepTitle number={4} title="Confirmez votre rendez-vous" />

                                <div className="mb-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-tint to-white p-4">
                                    <p className="font-semibold text-ink">{selectedOffer.name}</p>
                                    <p className="mt-1 text-sm text-ink">
                                        {formatLongDate(date)}, de {selectedSlot.startTime} à {selectedSlot.endTime}
                                    </p>
                                    <p className="mt-1 text-sm text-muted">
                                        {formatPrice(selectedOffer.price)} · {formatDuration(selectedOffer.duration)}
                                    </p>
                                </div>

                                <Textarea
                                    label="Notes pour le professionnel (facultatif)"
                                    rows={3}
                                    value={notes}
                                    onChange={setNotes}
                                    error={notesError}
                                    maxLength={NOTES_MAX}
                                />

                                <ErrorMessage message={bookError} details={bookDetails} />

                                <Button onClick={handleConfirm} loading={saving}>
                                    {saving ? "Réservation..." : "Confirmer la réservation"}
                                </Button>
                            </div>
                        )}

                        {/* Une erreur de réservation reste visible même quand le créneau choisi a disparu */}
                        {currentStep !== 4 && bookError !== "" && (
                            <ErrorMessage message={bookError} details={bookDetails} />
                        )}
                    </div>

                    {/* Bande « Sélection actuelle » + boutons Retour / Suivant */}
                    <div className="mt-6 space-y-4">
                        {(selectedOffer !== null || canLoad) && (
                            <div className="rounded-2xl border border-line bg-gradient-to-r from-tint to-white px-4 py-3 text-sm">
                                <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                                    Sélection actuelle
                                </p>
                                <p className="mt-0.5 font-medium text-ink">
                                    {selectedOffer !== null ? selectedOffer.name : "—"}
                                    {canLoad && " · " + formatLongDate(date)}
                                    {selectedSlot !== null &&
                                        " · " + selectedSlot.startTime + " – " + selectedSlot.endTime}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => goToStep(currentStep - 1)}
                                disabled={currentStep === 1}
                                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-tint active:scale-95 disabled:invisible"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Retour
                            </button>
                            {currentStep < 4 && (
                                <button
                                    type="button"
                                    onClick={() => goToStep(currentStep + 1)}
                                    disabled={currentStep >= firstIncomplete}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Suivant
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Colonne de droite : le mini-calendrier du professionnel */}
                <div className="border-t border-line bg-white/60 p-5 sm:p-6 lg:border-t-0 lg:border-l">
                    <BookingCalendar
                        professionalId={professionalId}
                        serviceId={serviceId}
                        duration={
                            selectedOffer !== null
                                ? selectedOffer.customDuration !== null
                                    ? selectedOffer.customDuration
                                    : selectedOffer.duration
                                : null
                        }
                        availabilities={availabilities}
                        selectedDate={canLoad ? date : ""}
                        selectedStart={selectedStart}
                        reloadKey={reloadCount}
                        onPickDate={chooseDate}
                        onPickSlot={chooseSlotFromCalendar}
                    />
                </div>
            </div>
        </section>
    );
}
