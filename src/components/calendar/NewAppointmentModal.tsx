"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, CalendarClock, Clock, Info, Phone, User } from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, ApiError } from "@/lib/lib-front/api-client";
import { useSession } from "@/context/session-context";
import { Availability, Offer, Unavailability } from "@/types/api";
import { AppointmentDetail, CreateManualAppointmentInput, SlotsResult } from "@/types/booking";
import { formatDuration, formatPrice } from "@/lib/lib-front/format";
import { getTodayLocalDate } from "@/lib/lib-front/booking-format";
import { isRealDateText } from "@/lib/datetime";
import {
    absencesOnDate,
    appointmentsOnDate,
    availabilitiesOnDate,
    clientName,
    getShortLongDate,
    minutesToClock,
    timeToMinutes,
} from "@/lib/lib-front/calendar-utils";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LottieLoader from "@/components/ui/LottieLoader";

const NAME_MIN = 2;
const NAME_MAX = 150;
const PHONE_MAX = 30;
const NOTES_MAX = 2000;

// Le décalage de Madagascar, pour écrire l'instant de début avec son fuseau (« …+03:00 »)
const LOCAL_OFFSET_TEXT = "+03:00";

// Un champ vide doit être envoyé au backend sous la forme null
function emptyToNull(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed === "") {
        return null;
    }
    return trimmed;
}

// Vrai si [start, end[ est entièrement couvert par les plages données
// (on avance de plage en plage, comme le fait le backend pour les clients)
function isCovered(start: number, end: number, blocks: { start: number; end: number }[]): boolean {
    let current = start;
    let moved = true;
    while (moved && current < end) {
        moved = false;
        for (const block of blocks) {
            if (block.start <= current && block.end > current) {
                current = block.end;
                moved = true;
            }
        }
    }
    return current >= end;
}

interface NewAppointmentModalProps {
    // Date proposée au départ (« AAAA-MM-JJ ») et, si on a cliqué sur un créneau, son heure en minutes
    date: string;
    minutes: number | null;
    // Ce que le calendrier connaît déjà : sert à prévenir d'un chevauchement ou d'un horaire inhabituel
    availabilities: Availability[];
    absences: Unavailability[];
    appointments: AppointmentDetail[];
    onClose: () => void;
    onCreated: (item: AppointmentDetail) => void;
}

// Le professionnel ajoute un rendez-vous à la main pour un client sans compte.
// Il choisit le service, le jour et l'heure (il peut sortir de ses horaires), puis note le nom du client.
export default function NewAppointmentModal({
    date: initialDate,
    minutes: initialMinutes,
    availabilities,
    absences,
    appointments,
    onClose,
    onCreated,
}: NewAppointmentModalProps) {
    const { user } = useSession();

    // Les services du professionnel
    const [offers, setOffers] = useState<Offer[]>([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [offersError, setOffersError] = useState("");

    const [serviceId, setServiceId] = useState<number | null>(null);
    const [date, setDate] = useState(initialDate);
    const [time, setTime] = useState(initialMinutes === null ? "" : minutesToClock(initialMinutes));
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [notes, setNotes] = useState("");

    // Les créneaux libres proposés comme raccourcis
    const [freeSlots, setFreeSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    // Chargement des services
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const loaded = await apiGet<Offer[]>("/api/professionals/me/services");
                if (cancelled) {
                    return;
                }
                setOffers(loaded);
                if (loaded.length === 1) {
                    setServiceId(loaded[0].serviceId);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }
                setOffersError(error instanceof ApiError ? error.message : "Impossible de charger vos services");
            }
            setOffersLoading(false);
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const offer = offers.find((item) => item.serviceId === serviceId) ?? null;
    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && isRealDateText(date);
    const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    const professionalId = user !== null ? user.userId : null;

    // Les créneaux libres du jour pour ce service (mêmes règles que pour un client)
    useEffect(() => {
        if (offer === null || dateValid === false || professionalId === null) {
            setFreeSlots([]);
            return;
        }
        let cancelled = false;
        async function loadSlots() {
            setSlotsLoading(true);
            try {
                const result = await apiGet<SlotsResult>(
                    "/api/professionals/" + professionalId + "/slots?serviceId=" + serviceId + "&date=" + date
                );
                if (cancelled === false) {
                    setFreeSlots(result.slots.map((slot) => slot.startTime));
                }
            } catch {
                // Pas de raccourcis : le professionnel peut toujours taper l'heure
                if (cancelled === false) {
                    setFreeSlots([]);
                }
            }
            if (cancelled === false) {
                setSlotsLoading(false);
            }
        }
        loadSlots();
        return () => {
            cancelled = true;
        };
    }, [offer, serviceId, date, dateValid, professionalId]);

    // ---- Calculs d'aperçu ----
    let startMinutes = 0;
    let endMinutes = 0;
    if (timeValid) {
        startMinutes = timeToMinutes(time);
        if (offer !== null) {
            endMinutes = startMinutes + offer.duration;
        }
    }
    const canPreview = offer !== null && dateValid && timeValid;

    let overlapWith: AppointmentDetail | null = null;
    let outsideHours = false;
    let duringAbsence = false;
    let inPast = false;
    let overMidnight = false;

    if (canPreview) {
        for (const segment of appointmentsOnDate(appointments, date, false)) {
            if (segment.start < endMinutes && segment.end > startMinutes) {
                overlapWith = segment.data;
                break;
            }
        }
        const blocks = availabilitiesOnDate(availabilities, date).map((segment) => ({
            start: segment.start,
            end: segment.end,
        }));
        outsideHours = isCovered(startMinutes, endMinutes, blocks) === false;
        for (const segment of absencesOnDate(absences, date)) {
            if (segment.start < endMinutes && segment.end > startMinutes) {
                duringAbsence = true;
            }
        }
        inPast = new Date(date + "T" + time + ":00" + LOCAL_OFFSET_TEXT).getTime() <= Date.now();
        overMidnight = endMinutes > 24 * 60;
    }

    // ---- Validation ----
    const nameTrimmed = guestName.trim();
    let nameError = "";
    if (nameTrimmed.length < NAME_MIN) {
        nameError = "Le nom du client doit contenir au moins 2 caractères";
    } else if (nameTrimmed.length > NAME_MAX) {
        nameError = "Le nom du client est trop long (150 caractères maximum)";
    }
    let phoneError = "";
    if (guestPhone.trim().length > PHONE_MAX) {
        phoneError = "Le téléphone est trop long (30 caractères maximum)";
    }
    let notesError = "";
    if (notes.trim().length > NOTES_MAX) {
        notesError = "Les notes sont trop longues (2000 caractères maximum)";
    }
    let dateError = "";
    if (dateValid === false) {
        dateError = "Choisissez une date valide";
    }
    let timeError = "";
    if (timeValid === false) {
        timeError = "Choisissez une heure";
    }

    const formValid =
        offer !== null &&
        dateError === "" &&
        timeError === "" &&
        nameError === "" &&
        phoneError === "" &&
        notesError === "" &&
        overlapWith === null &&
        overMidnight === false;

    function closeModal() {
        if (saving) {
            return;
        }
        onClose();
    }

    async function handleSubmit() {
        setTouched(true);
        setErrorMessage("");
        setErrorDetails([]);
        if (formValid === false || offer === null) {
            return;
        }

        const body: CreateManualAppointmentInput = {
            serviceId: offer.serviceId,
            startDatetime: date + "T" + time + ":00" + LOCAL_OFFSET_TEXT,
            guestName: nameTrimmed,
            guestPhone: emptyToNull(guestPhone),
            notes: emptyToNull(notes),
        };

        setSaving(true);
        try {
            const created = await apiPost<AppointmentDetail>("/api/professionals/me/appointments", body);
            onCreated(created);
        } catch (error) {
            if (error instanceof ApiError) {
                setErrorMessage(error.message);
                setErrorDetails(error.details);
            } else {
                setErrorMessage("Erreur inattendue");
            }
            setSaving(false);
        }
    }

    // ---- Affichage ----
    if (offersLoading) {
        return (
            <Modal open={true} title="Nouveau rendez-vous" onClose={onClose}>
                <div className="flex items-center justify-center py-12">
                    <LottieLoader kind="dots" size={40} />
                </div>
            </Modal>
        );
    }

    if (offersError !== "") {
        return (
            <Modal open={true} title="Nouveau rendez-vous" onClose={onClose}>
                <ErrorMessage message={offersError} details={[]} />
                <div className="flex justify-end">
                    <Button variant="secondary" fullWidth={false} onClick={onClose}>
                        Fermer
                    </Button>
                </div>
            </Modal>
        );
    }

    if (offers.length === 0) {
        return (
            <Modal open={true} title="Nouveau rendez-vous" onClose={onClose}>
                <p className="text-sm text-ink">
                    Pour ajouter un rendez-vous, vous devez d&apos;abord proposer au moins un service.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                    <Button variant="secondary" fullWidth={false} onClick={onClose}>
                        Fermer
                    </Button>
                    <Link
                        href="/pro/services"
                        className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
                    >
                        Mes services
                    </Link>
                </div>
            </Modal>
        );
    }

    const today = getTodayLocalDate();
    const showErrors = touched;

    return (
        <Modal open={true} title="Nouveau rendez-vous" onClose={closeModal} wide>
            <p className="-mt-3 mb-5 text-sm text-muted">
                Pour un client qui n&apos;a pas de compte. Le rendez-vous est confirmé tout de suite.
            </p>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-2 md:grid-cols-2">
                {/* ---------- Colonne 1 : quand et quoi ---------- */}
                <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Service et horaire
                    </p>

                    <Select
                        label="Service"
                        value={serviceId === null ? "" : String(serviceId)}
                        onChange={(value) => setServiceId(Number(value))}
                        placeholder="Choisir un service"
                        options={offers.map((item) => ({
                            value: String(item.serviceId),
                            label: item.name,
                            detail: formatDuration(item.duration),
                            badge: formatPrice(item.price),
                        }))}
                    />
                    {offer !== null && (
                        <p className="-mt-2.5 mb-4 text-xs text-muted">
                            {formatDuration(offer.duration)} · {formatPrice(offer.price)}
                        </p>
                    )}
                    {showErrors && offer === null && (
                        <span className="-mt-3 mb-3 block text-xs text-red-600">Choisissez un service</span>
                    )}

                    <div className="grid grid-cols-2 gap-3 [&>label]:min-w-0">
                        <Input
                            label="Date"
                            type="date"
                            value={date}
                            onChange={setDate}
                            error={showErrors ? dateError : ""}
                        />
                        <Input
                            label="Heure de début"
                            type="time"
                            value={time}
                            onChange={setTime}
                            error={showErrors ? timeError : ""}
                        />
                    </div>

                    {/* Raccourcis : les créneaux libres dans les horaires */}
                    {offer !== null && dateValid && (
                        <div className="-mt-1 mb-4">
                            <p className="mb-1.5 text-xs text-muted">
                                {slotsLoading
                                    ? "Recherche des créneaux libres…"
                                    : freeSlots.length > 0
                                      ? "Créneaux libres ce jour-là"
                                      : date < today
                                        ? "Jour passé : tapez l'heure."
                                        : "Aucun créneau libre dans vos horaires : tapez l'heure."}
                            </p>
                            {freeSlots.length > 0 && (
                                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                                    {freeSlots.map((slotTime) => (
                                        <button
                                            type="button"
                                            key={slotTime}
                                            onClick={() => setTime(slotTime)}
                                            className={
                                                "rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors " +
                                                (time === slotTime
                                                    ? "border-primary bg-primary text-white"
                                                    : "border-line bg-white text-ink hover:border-primary/50 hover:bg-tint")
                                            }
                                        >
                                            {slotTime}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ---------- Colonne 2 : le client ---------- */}
                <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
                        <User className="h-3.5 w-3.5" />
                        Client
                    </p>
                    <Input
                        label="Nom du client"
                        value={guestName}
                        onChange={setGuestName}
                        placeholder="Ex. Marie Rakoto"
                        maxLength={NAME_MAX}
                        error={showErrors ? nameError : ""}
                    />
                    <Input
                        label="Téléphone (facultatif)"
                        type="tel"
                        value={guestPhone}
                        onChange={setGuestPhone}
                        placeholder="Ex. 034 12 345 67"
                        error={showErrors ? phoneError : ""}
                    />
                    <Textarea
                        label="Notes (facultatif)"
                        value={notes}
                        onChange={setNotes}
                        rows={3}
                        maxLength={NOTES_MAX}
                        error={showErrors ? notesError : ""}
                    />
                </div>
            </div>

            {/* ---------- Aperçu et avertissements ---------- */}
            {canPreview && offer !== null && (
                <div className="mt-2 rounded-xl border border-line bg-page/70 p-4">
                    <p className="text-sm font-semibold text-ink">
                        {getShortLongDate(date)} · {minutesToClock(startMinutes)} –{" "}
                        {overMidnight ? "minuit+" : minutesToClock(endMinutes)}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {formatDuration(offer.duration)}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-primary">
                            <Banknote className="h-4 w-4" />
                            {formatPrice(offer.price)}
                        </span>
                        {nameTrimmed !== "" && (
                            <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {nameTrimmed}
                            </span>
                        )}
                        {guestPhone.trim() !== "" && (
                            <span className="flex items-center gap-1.5">
                                <Phone className="h-4 w-4" />
                                {guestPhone.trim()}
                            </span>
                        )}
                    </p>

                    <ul className="mt-3 space-y-1.5 empty:hidden">
                        {overlapWith !== null && (
                            <li className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                Ce créneau chevauche le rendez-vous de {clientName(overlapWith)} (
                                {overlapWith.service.name}). Choisissez une autre heure.
                            </li>
                        )}
                        {overMidnight && (
                            <li className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                Le rendez-vous finirait après minuit : choisissez une heure plus tôt.
                            </li>
                        )}
                        {overlapWith === null && duringAbsence && (
                            <li className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                Vous avez une absence à ce moment-là. Le rendez-vous sera créé quand même.
                            </li>
                        )}
                        {overlapWith === null && duringAbsence === false && outsideHours && (
                            <li className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                Ce créneau est en dehors de vos horaires. Le rendez-vous sera créé quand même.
                            </li>
                        )}
                        {inPast && (
                            <li className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                Ce rendez-vous est dans le passé.
                            </li>
                        )}
                    </ul>
                </div>
            )}

            <div className="mt-4">
                <ErrorMessage message={errorMessage} details={errorDetails} />
            </div>

            <div className="mt-2 flex justify-end gap-3">
                <Button variant="secondary" fullWidth={false} onClick={closeModal} disabled={saving}>
                    Annuler
                </Button>
                <Button fullWidth={false} onClick={handleSubmit} loading={saving} disabled={saving}>
                    {saving ? "Ajout..." : "Ajouter le rendez-vous"}
                </Button>
            </div>
        </Modal>
    );
}
