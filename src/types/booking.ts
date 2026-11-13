// Le service proposé par un professionnel, avec SON prix et SA durée
export interface ProfessionalOffer {
    serviceId: number;
    serviceName: string;
    price: number;
    duration: number;
}

// Un résultat de GET /api/professionals.
// offer vaut null quand on n'a pas filtré par service.
export interface ProfessionalSearchItem {
    userId: number;
    firstName: string;
    lastName: string;
    specialty: string | null;
    description: string | null;
    offer: ProfessionalOffer | null;
}

// Un créneau libre.
// startDatetime / endDatetime : instants en UTC, à renvoyer tels quels pour réserver.
// startTime / endTime : heures locales de Madagascar, à afficher.
export interface Slot {
    startDatetime: string;
    endDatetime: string;
    startTime: string;
    endTime: string;
}

// La réponse de GET /api/professionals/[id]/slots
export interface SlotsResult {
    professionalId: number;
    serviceId: number;
    date: string;
    duration: number;
    price: number;
    slots: Slot[];
}

// Les données envoyées pour réserver (POST /api/appointments)
export interface CreateAppointmentInput {
    professionalId: number;
    serviceId: number;
    startDatetime: string;
    notes: string | null;
}

// Le rendez-vous renvoyé après la réservation (dates en UTC)
export interface AppointmentItem {
    id: number;
    startDatetime: string;
    endDatetime: string;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: number | null;
    clientId: number | null; // null = rendez-vous ajouté à la main pour un invité
    professionalId: number;
    serviceId: number;
}

// Un rendez-vous tel que la liste le renvoie (GET /api/appointments) :
// avec son service, son professionnel et son client. Dates en UTC.
// status : PENDING, CONFIRMED, CANCELLED, COMPLETED ou NO_SHOW.
export interface AppointmentDetail {
    id: number;
    startDatetime: string;
    endDatetime: string;
    status: string;
    notes: string | null;
    location: string | null;
    priceAtBooking: number | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    service: { id: number; name: string };
    professional: {
        userId: number;
        firstName: string;
        lastName: string;
        specialty: string | null;
    };
    // Client avec compte : "client" est rempli et "guest" vaut null.
    // Invité (ajouté à la main par le professionnel) : "client" vaut null et "guest" est rempli.
    client: {
        userId: number;
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
    } | null;
    guest: {
        name: string;
        phoneNumber: string | null;
    } | null;
}

// Les données envoyées par le professionnel pour ajouter un rendez-vous
// (POST /api/professionals/me/appointments)
export interface CreateManualAppointmentInput {
    serviceId: number;
    startDatetime: string;
    guestName: string;
    guestPhone: string | null;
    notes: string | null;
}

// Les données envoyées pour annuler (POST /api/appointments/[id]/cancel)
export interface CancelAppointmentInput {
    reason: string | null;
}