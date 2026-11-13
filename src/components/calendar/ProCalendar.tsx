"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { apiDelete, apiGet, ApiError } from "@/lib/lib-front/api-client";
import { Availability, Unavailability } from "@/types/api";
import { AppointmentDetail } from "@/types/booking";
import { getDayName } from "@/lib/lib-front/days";
import { getTodayLocalDate } from "@/lib/lib-front/booking-format";
import { dayOfWeekOfDateText, toLocalMoment } from "@/lib/datetime";
import {
    AvailabilityGroup,
    describeGroup,
    groupAvailabilities,
} from "@/lib/lib-front/availability-groups";
import { describeAbsence } from "@/lib/lib-front/unavailability-format";
import {
    CalendarView,
    absencesOnDate,
    clientName,
    availabilitiesOnDate,
    appointmentsOnDate,
    getCalendarTitle,
    getMonthDates,
    getWeekDates,
    monthKey,
    minutesToClock,
    shiftDate,
} from "@/lib/lib-front/calendar-utils";
import PageLoading from "@/components/ui/PageLoading";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SuccessMessage from "@/components/ui/SuccessMessage";
import AvailabilityModal, { AvailabilityInitial, SaveResult } from "@/components/availability/AvailabilityModal";
import UnavailabilityModal, { UnavailabilityInitial } from "@/components/unavailability/UnavailabilityModal";
import NewAppointmentModal from "@/components/calendar/NewAppointmentModal";
import CancelAppointmentModal from "@/components/appointments/CancelAppointmentModal";
import { TONES, ToneKey } from "@/lib/lib-front/calendar-theme";
import TimeGrid from "@/components/calendar/TimeGrid";
import DayAgenda from "@/components/calendar/DayAgenda";
import MonthGrid from "@/components/calendar/MonthGrid";
import { AbsenceDialog, AppointmentDialog, SlotDialog } from "@/components/calendar/CalendarDialogs";

// Les éléments de la légende, dans l'ordre
const LEGEND: ToneKey[] = ["availability", "absence", "CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"];

const VIEWS: { value: CalendarView; label: string }[] = [
    { value: "day", label: "Jour" },
    { value: "week", label: "Semaine" },
    { value: "month", label: "Mois" },
];

// Ce qu'on est en train de supprimer (avec confirmation)
type RemoveTarget =
    | { kind: "availability"; group: AvailabilityGroup }
    | { kind: "absence"; item: Unavailability };

interface Warning {
    message: string;
    details: string[];
}

export default function ProCalendar() {
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [absences, setAbsences] = useState<Unavailability[]>([]);
    const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [view, setView] = useState<CalendarView>("week");
    const [today, setToday] = useState(() => getTodayLocalDate());
    const [anchorDate, setAnchorDate] = useState(() => getTodayLocalDate());
    const [nowMinutes, setNowMinutes] = useState(() => toLocalMoment(new Date()).minutes);
    const [showCancelled, setShowCancelled] = useState(false);

    const [successMessage, setSuccessMessage] = useState("");
    const [warning, setWarning] = useState<Warning | null>(null);

    // Les fenêtres
    const [slot, setSlot] = useState<{ date: string; minutes: number } | null>(null);
    const [newAppointment, setNewAppointment] = useState<{ date: string; minutes: number | null } | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetail | null>(null);
    const [cancelling, setCancelling] = useState<AppointmentDetail | null>(null);
    const [selectedAbsence, setSelectedAbsence] = useState<Unavailability | null>(null);
    const [availabilityForm, setAvailabilityForm] = useState<{
        group: AvailabilityGroup | null;
        initial?: AvailabilityInitial;
    } | null>(null);
    const [absenceForm, setAbsenceForm] = useState<{
        item: Unavailability | null;
        initial?: UnavailabilityInitial;
    } | null>(null);
    const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState("");

    // Lit les trois listes dans le backend
    const fetchAll = useCallback(async () => {
        const [loadedAvailabilities, loadedAbsences, loadedAppointments] = await Promise.all([
            apiGet<Availability[]>("/api/professionals/me/availabilities"),
            apiGet<Unavailability[]>("/api/professionals/me/unavailabilities"),
            apiGet<AppointmentDetail[]>("/api/appointments"),
        ]);
        setAvailabilities(loadedAvailabilities);
        setAbsences(loadedAbsences);
        setAppointments(loadedAppointments);
    }, []);

    useEffect(() => {
        async function firstLoad() {
            try {
                await fetchAll();
            } catch (error) {
                if (error instanceof ApiError) {
                    setLoadError(error.message);
                } else {
                    setLoadError("Impossible de charger votre calendrier");
                }
            }
            setLoading(false);
        }
        firstLoad();
    }, [fetchAll]);

    // Sur téléphone, on ouvre la vue Jour : sept colonnes seraient trop étroites
    useEffect(() => {
        if (window.innerWidth < 640) {
            setView("day");
        }
    }, []);

    // La ligne « maintenant » et la date du jour avancent toutes seules
    useEffect(() => {
        const timer = setInterval(() => {
            setNowMinutes(toLocalMoment(new Date()).minutes);
            setToday(getTodayLocalDate());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Après chaque modification : on relit tout, l'écran montre toujours la réalité
    async function reloadAll() {
        try {
            await fetchAll();
        } catch {
            setWarning({ message: "Le calendrier n'a pas pu être rafraîchi : rechargez la page.", details: [] });
        }
    }

    const groups = groupAvailabilities(availabilities);

    function groupOf(item: Availability): AvailabilityGroup | null {
        for (const group of groups) {
            for (const candidate of group.items) {
                if (candidate.id === item.id) {
                    return group;
                }
            }
        }
        return null;
    }

    // Les cartes d'horaires qui s'appliquent à un jour donné (sans doublon)
    function groupsOnDate(date: string): AvailabilityGroup[] {
        const found: AvailabilityGroup[] = [];
        for (const segment of availabilitiesOnDate(availabilities, date)) {
            const group = groupOf(segment.data);
            if (group !== null && found.some((existing) => existing.key === group.key) === false) {
                found.push(group);
            }
        }
        return found;
    }

    function clearMessages() {
        setSuccessMessage("");
        setWarning(null);
    }

    // -------- Navigation --------
    function goPrevious() {
        setAnchorDate(shiftDate(view, anchorDate, -1));
    }
    function goNext() {
        setAnchorDate(shiftDate(view, anchorDate, 1));
    }
    function goToday() {
        setAnchorDate(today);
    }

    // -------- Ouvrir les formulaires --------
    function openNewAppointment(date: string, minutes: number | null) {
        clearMessages();
        setSlot(null);
        setNewAppointment({ date: date, minutes: minutes });
    }

    function openAvailabilityForm(date: string, minutes: number | null) {
        clearMessages();
        setSlot(null);
        const start = minutes === null ? 9 * 60 : minutes;
        const end = minutes === null ? 12 * 60 : Math.min(start + 120, 24 * 60 - 1);
        setAvailabilityForm({
            group: null,
            initial: {
                days: [dayOfWeekOfDateText(date)],
                startTime: minutesToClock(start),
                endTime: minutesToClock(end),
            },
        });
    }

    function openAbsenceForm(date: string, minutes: number | null) {
        clearMessages();
        setSlot(null);
        if (minutes === null) {
            setAbsenceForm({
                item: null,
                initial: { allDay: true, startDate: date, endDate: date, startTime: "", endTime: "" },
            });
            return;
        }
        setAbsenceForm({
            item: null,
            initial: {
                allDay: false,
                startDate: date,
                endDate: date,
                startTime: minutesToClock(minutes),
                endTime: minutesToClock(Math.min(minutes + 60, 24 * 60 - 1)),
            },
        });
    }

    function openEditGroup(group: AvailabilityGroup) {
        clearMessages();
        setSlot(null);
        setAvailabilityForm({ group: group });
    }

    function openRemoveGroup(group: AvailabilityGroup) {
        clearMessages();
        setSlot(null);
        setRemoveError("");
        setRemoveTarget({ kind: "availability", group: group });
    }

    function openEditAbsence(item: Unavailability) {
        clearMessages();
        setSelectedAbsence(null);
        setAbsenceForm({ item: item });
    }

    function openRemoveAbsence(item: Unavailability) {
        clearMessages();
        setSelectedAbsence(null);
        setRemoveError("");
        setRemoveTarget({ kind: "absence", item: item });
    }

    // -------- Retours des formulaires --------
    async function handleAvailabilityDone(result: SaveResult) {
        setAvailabilityForm(null);
        await reloadAll();
        if (result.failures.length === 0) {
            setSuccessMessage(result.summary);
        } else {
            setSuccessMessage("");
            setWarning({
                message: "Enregistrement partiel (" + result.summary + "). Ces jours n'ont pas pu être enregistrés :",
                details: result.failures,
            });
        }
    }

    async function handleAbsenceSaved(_item: Unavailability, message: string) {
        setAbsenceForm(null);
        await reloadAll();
        setSuccessMessage(message);
    }

    async function handleAppointmentCreated(created: AppointmentDetail) {
        const date = toLocalMoment(new Date(created.startDatetime)).dateText;
        setNewAppointment(null);
        await reloadAll();
        // On se place sur le jour du rendez-vous pour le voir tout de suite
        setAnchorDate(date);
        setSuccessMessage("Rendez-vous ajouté pour " + clientName(created));
    }

    async function handleCancelled() {
        setCancelling(null);
        await reloadAll();
        setSuccessMessage("Rendez-vous annulé");
    }

    async function handleStale() {
        setCancelling(null);
        await reloadAll();
    }

    // -------- Suppression --------
    function closeRemove() {
        if (removeBusy) {
            return;
        }
        setRemoveTarget(null);
    }

    async function confirmRemove() {
        if (removeTarget === null) {
            return;
        }
        setRemoveBusy(true);
        setRemoveError("");

        if (removeTarget.kind === "absence") {
            try {
                await apiDelete<unknown>("/api/professionals/me/unavailabilities/" + removeTarget.item.id);
                await reloadAll();
                setSuccessMessage("Absence supprimée");
                setRemoveTarget(null);
            } catch (error) {
                setRemoveError(error instanceof ApiError ? error.message : "Erreur inattendue");
            }
            setRemoveBusy(false);
            return;
        }

        // Plage horaire : une requête par jour de la carte
        let removedCount = 0;
        const failures: string[] = [];
        for (const item of removeTarget.group.items) {
            try {
                await apiDelete<unknown>("/api/professionals/me/availabilities/" + item.id);
                removedCount = removedCount + 1;
            } catch (error) {
                const message = error instanceof ApiError ? error.message : "Erreur inattendue";
                failures.push(getDayName(item.dayOfWeek) + " : " + message);
            }
        }
        if (removedCount > 0) {
            await reloadAll();
        }
        if (failures.length === 0) {
            setSuccessMessage(removedCount === 1 ? "Plage horaire supprimée" : removedCount + " plages supprimées");
            setRemoveTarget(null);
        } else if (removedCount === 0) {
            setRemoveError(failures[0]);
        } else {
            setRemoveTarget(null);
            setWarning({
                message: "Suppression partielle (" + removedCount + " supprimée(s)). Ces jours n'ont pas pu être supprimés :",
                details: failures,
            });
        }
        setRemoveBusy(false);
    }

    // Le bouton « Annuler » d'un rendez-vous : seulement s'il est en attente ou confirmé et pas commencé
    function canCancel(item: AppointmentDetail): boolean {
        const cancellable = item.status === "PENDING" || item.status === "CONFIRMED";
        return cancellable && new Date(item.startDatetime).getTime() > Date.now();
    }

    if (loading) {
        return <PageLoading kind="calendar" label="Chargement de votre calendrier..." />;
    }
    if (loadError !== "") {
        return <ErrorMessage message={loadError} details={[]} />;
    }

    const weekDates = getWeekDates(anchorDate);

    // Message de la fenêtre de suppression
    let removeTitle = "";
    let removeText = "";
    if (removeTarget !== null) {
        if (removeTarget.kind === "availability") {
            removeTitle = "Supprimer cette plage ?";
            removeText =
                "Voulez-vous supprimer la plage « " +
                describeGroup(removeTarget.group) +
                " » ? " +
                (removeTarget.group.items.length > 1
                    ? "Cela supprime " + removeTarget.group.items.length + " plages (une par jour). "
                    : "") +
                "Les clients ne pourront plus réserver sur cette plage. Les rendez-vous déjà pris ne sont pas modifiés.";
        } else {
            removeTitle = "Supprimer cette absence ?";
            removeText = "Voulez-vous supprimer l'absence « " + describeAbsence(removeTarget.item).title + " » ?";
        }
    }

    // Les jours affichés, pour le résumé sous le titre
    let visibleDates: string[] = [anchorDate];
    if (view === "week") {
        visibleDates = weekDates;
    } else if (view === "month") {
        visibleDates = getMonthDates(anchorDate).filter((date) => monthKey(date) === monthKey(anchorDate));
    }
    const countedIds = new Set<number>();
    let pendingCount = 0;
    for (const date of visibleDates) {
        for (const segment of appointmentsOnDate(appointments, date, false)) {
            if (segment.data.status !== "NO_SHOW" && countedIds.has(segment.data.id) === false) {
                countedIds.add(segment.data.id);
                if (segment.data.status === "PENDING") {
                    pendingCount = pendingCount + 1;
                }
            }
        }
    }
    let summary = "Aucun rendez-vous";
    if (countedIds.size > 0) {
        summary = countedIds.size + (countedIds.size === 1 ? " rendez-vous" : " rendez-vous");
        if (pendingCount > 0) {
            summary = summary + " · " + pendingCount + " en attente";
        }
    }
    const viewIndex = VIEWS.findIndex((item) => item.value === view);

    return (
        <div>
            {/* Même en-tête que les autres pages : titre, trait, boutons */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-ink">Mon calendrier</h1>
                <div className="hidden h-px min-w-8 flex-1 bg-line sm:block" />
                <Button variant="secondary" fullWidth={false} onClick={() => openAbsenceForm(anchorDate, null)}>
                    <span className="flex items-center gap-1.5 text-red-600">
                        <CalendarOff className="h-4 w-4" />
                        Absence
                    </span>
                </Button>
                <Button variant="secondary" fullWidth={false} onClick={() => openAvailabilityForm(anchorDate, null)}>
                    <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Disponibilité
                    </span>
                </Button>
                <Button fullWidth={false} onClick={() => openNewAppointment(anchorDate, null)}>
                    <span className="flex items-center gap-1.5">
                        <CalendarPlus className="h-4 w-4" />
                        Rendez-vous
                    </span>
                </Button>
            </div>
            <p className="mb-6 text-sm text-muted">
                Vos disponibilités, vos absences et vos rendez-vous au même endroit. Les heures sont en heure
                locale de Madagascar.
            </p>

            <SuccessMessage message={successMessage} />
            {warning !== null && <ErrorMessage message={warning.message} details={warning.details} />}

            <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                {/* Barre du calendrier : période, navigation, vues */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1 basis-52">
                        <h2
                            key={view + anchorDate}
                            className="animate-fade-in truncate text-lg font-bold text-ink"
                        >
                            {getCalendarTitle(view, anchorDate)}
                        </h2>
                        <p className="text-xs text-muted">{summary}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border border-line bg-white p-0.5">
                            <button
                                type="button"
                                onClick={goPrevious}
                                aria-label="Période précédente"
                                className="rounded-md p-1.5 text-muted transition-colors hover:bg-tint hover:text-ink active:scale-95"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={goToday}
                                className="rounded-md px-2.5 py-1 text-sm font-medium text-ink transition-colors hover:bg-tint active:scale-95"
                            >
                                Aujourd&apos;hui
                            </button>
                            <button
                                type="button"
                                onClick={goNext}
                                aria-label="Période suivante"
                                className="rounded-md p-1.5 text-muted transition-colors hover:bg-tint hover:text-ink active:scale-95"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Jour / Semaine / Mois : l'indicateur blanc glisse sous le choix */}
                        <div
                            role="tablist"
                            aria-label="Affichage du calendrier"
                            className="relative grid grid-cols-3 rounded-lg border border-line bg-page p-0.5"
                        >
                            <span
                                aria-hidden="true"
                                className="absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-md bg-primary shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                style={{ transform: "translateX(" + viewIndex * 100 + "%)" }}
                            />
                            {VIEWS.map((item) => (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={view === item.value}
                                    key={item.value}
                                    onClick={() => setView(item.value)}
                                    className={
                                        "relative z-10 rounded-md px-3 py-1 text-sm font-medium transition-colors " +
                                        (view === item.value ? "text-white" : "text-muted hover:text-ink")
                                    }
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Légende discrète */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-page/60 px-4 py-2 sm:px-5">
                    {LEGEND.map((key) => (
                        <span key={key} className="flex items-center gap-1.5 text-xs text-muted">
                            <span className={"h-2.5 w-2.5 rounded-[3px] " + TONES[key].swatch} />
                            {TONES[key].label}
                        </span>
                    ))}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={showCancelled}
                        onClick={() => setShowCancelled(!showCancelled)}
                        className="ml-auto flex items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-ink"
                    >
                        Afficher les annulés
                        <span
                            className={
                                "relative h-[18px] w-8 rounded-full transition-colors duration-200 " +
                                (showCancelled ? "bg-primary" : "bg-gray-300")
                            }
                        >
                            <span
                                className={
                                    "absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 " +
                                    (showCancelled ? "translate-x-3.5" : "translate-x-0")
                                }
                            />
                        </span>
                    </button>
                </div>

                {/* La vue choisie. key = l'animation repart à chaque changement de vue ou de période */}
                <div key={view + anchorDate} className="animate-fade-in">
                    {view === "month" && (
                        <MonthGrid
                            anchorDate={anchorDate}
                            today={today}
                            availabilities={availabilities}
                            absences={absences}
                            appointments={appointments}
                            showCancelled={showCancelled}
                            onDayClick={(date) => {
                                setAnchorDate(date);
                                setView("day");
                            }}
                            onAppointmentClick={setSelectedAppointment}
                            onAbsenceClick={setSelectedAbsence}
                        />
                    )}

                    {view === "week" && (
                        <TimeGrid
                            dates={weekDates}
                            today={today}
                            nowMinutes={nowMinutes}
                            availabilities={availabilities}
                            absences={absences}
                            appointments={appointments}
                            showCancelled={showCancelled}
                            onSlotClick={(date, minutes) => setSlot({ date: date, minutes: minutes })}
                            onAppointmentClick={setSelectedAppointment}
                            onAbsenceClick={setSelectedAbsence}
                        />
                    )}

                    {view === "day" && (
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
                            <TimeGrid
                                dates={[anchorDate]}
                                today={today}
                                nowMinutes={nowMinutes}
                                availabilities={availabilities}
                                absences={absences}
                                appointments={appointments}
                                showCancelled={showCancelled}
                                onSlotClick={(date, minutes) => setSlot({ date: date, minutes: minutes })}
                                onAppointmentClick={setSelectedAppointment}
                                onAbsenceClick={setSelectedAbsence}
                            />
                            <div className="border-t border-line bg-page/70 p-3 lg:border-t-0 lg:border-l">
                                <DayAgenda
                                    date={anchorDate}
                                    availabilities={availabilities}
                                    absences={absences}
                                    appointments={appointments}
                                    showCancelled={showCancelled}
                                    onAppointmentClick={setSelectedAppointment}
                                    onAbsenceClick={setSelectedAbsence}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <p className="mt-3 text-xs text-muted">
                Cliquez sur un créneau vide pour ajouter un rendez-vous, une disponibilité ou une absence, ou sur un rendez-vous
                ou une absence pour le gérer.
            </p>
            {/* ---- Fenêtres ---- */}
            {slot !== null && (
                <SlotDialog
                    date={slot.date}
                    minutes={slot.minutes}
                    dayGroups={groupsOnDate(slot.date)}
                    onAddAppointment={() => openNewAppointment(slot.date, slot.minutes)}
                    onAddAvailability={() => openAvailabilityForm(slot.date, slot.minutes)}
                    onAddAbsence={() => openAbsenceForm(slot.date, slot.minutes)}
                    onEditGroup={openEditGroup}
                    onRemoveGroup={openRemoveGroup}
                    onClose={() => setSlot(null)}
                />
            )}

            {newAppointment !== null && (
                <NewAppointmentModal
                    date={newAppointment.date}
                    minutes={newAppointment.minutes}
                    availabilities={availabilities}
                    absences={absences}
                    appointments={appointments}
                    onClose={() => setNewAppointment(null)}
                    onCreated={handleAppointmentCreated}
                />
            )}

            {selectedAppointment !== null && (
                <AppointmentDialog
                    item={selectedAppointment}
                    canCancel={canCancel(selectedAppointment)}
                    onCancel={() => {
                        setCancelling(selectedAppointment);
                        setSelectedAppointment(null);
                    }}
                    onClose={() => setSelectedAppointment(null)}
                />
            )}

            {cancelling !== null && (
                <CancelAppointmentModal
                    item={cancelling}
                    role="PROFESSIONAL"
                    onClose={() => setCancelling(null)}
                    onCancelled={handleCancelled}
                    onStale={handleStale}
                />
            )}

            {selectedAbsence !== null && (
                <AbsenceDialog
                    item={selectedAbsence}
                    onEdit={() => openEditAbsence(selectedAbsence)}
                    onRemove={() => openRemoveAbsence(selectedAbsence)}
                    onClose={() => setSelectedAbsence(null)}
                />
            )}

            {availabilityForm !== null && (
                <AvailabilityModal
                    group={availabilityForm.group}
                    initial={availabilityForm.initial}
                    onClose={() => setAvailabilityForm(null)}
                    onDone={handleAvailabilityDone}
                />
            )}

            {absenceForm !== null && (
                <UnavailabilityModal
                    item={absenceForm.item}
                    initial={absenceForm.initial}
                    onClose={() => setAbsenceForm(null)}
                    onSaved={handleAbsenceSaved}
                />
            )}

            <Modal open={removeTarget !== null} title={removeTitle} onClose={closeRemove}>
                {removeTarget !== null && (
                    <div>
                        <p className="mb-4 text-sm text-ink">{removeText}</p>
                        <ErrorMessage message={removeError} details={[]} />
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" fullWidth={false} onClick={closeRemove} disabled={removeBusy}>
                                Annuler
                            </Button>
                            <Button variant="danger" fullWidth={false} onClick={confirmRemove} loading={removeBusy}>
                                {removeBusy ? "Suppression..." : "Supprimer"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
