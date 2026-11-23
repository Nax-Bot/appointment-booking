import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Les statuts possibles d'un rendez-vous (comme dans le schéma Prisma)
export type AppointmentStatusValue = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

// Données d'un nouveau rendez-vous réservé par un client
export interface NewAppointmentData {
  clientId: number;
  professionalId: number;
  serviceId: number;
  startDatetime: Date;
  endDatetime: Date;
  priceAtBooking: number;
  notes: string | null;
}

// Données d'un rendez-vous ajouté à la main par le professionnel (client sans compte)
export interface NewManualAppointmentData {
  professionalId: number;
  serviceId: number;
  startDatetime: Date;
  endDatetime: Date;
  priceAtBooking: number;
  status: AppointmentStatusValue;
  guestName: string;
  guestPhone: string | null;
  notes: string | null;
}

export class AppointmentRepository {
  // Les rendez-vous non annulés d'un professionnel qui chevauchent la période donnée
  // (deux périodes qui se touchent ne se chevauchent pas)
  async findOverlapping(professionalId: number, start: Date, end: Date, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findMany({
      where: {
        professionalId: professionalId,
        status: { not: "CANCELLED" },
        startDatetime: { lt: end },
        endDatetime: { gt: start },
      },
    });
  }

  // Les rendez-vous ACTIFS (en attente ou confirmés) d'un professionnel qui chevauchent la période donnée.
  // Sert à protéger les rendez-vous existants : un terminé, absent ou annulé n'empêche rien.
  async findActiveOverlapping(professionalId: number, start: Date, end: Date, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findMany({
      where: {
        professionalId: professionalId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDatetime: { lt: end },
        endDatetime: { gt: start },
      },
      orderBy: { startDatetime: "asc" },
    });
  }

  // Les rendez-vous ACTIFS (en attente ou confirmés) d'un professionnel qui ne sont pas encore terminés à cet instant
  async findActiveEndingAfter(professionalId: number, after: Date, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findMany({
      where: {
        professionalId: professionalId,
        status: { in: ["PENDING", "CONFIRMED"] },
        endDatetime: { gt: after },
      },
      orderBy: { startDatetime: "asc" },
    });
  }

  // Crée un rendez-vous réservé par un client (le statut vaut PENDING par défaut)
  async create(data: NewAppointmentData, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.create({
      data: {
        clientId: data.clientId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        startDatetime: data.startDatetime,
        endDatetime: data.endDatetime,
        priceAtBooking: data.priceAtBooking,
        notes: data.notes,
      },
    });
  }

  // Crée un rendez-vous ajouté à la main : pas de clientId, mais le nom (et le téléphone) de l'invité
  async createManual(data: NewManualAppointmentData, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.create({
      data: {
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        startDatetime: data.startDatetime,
        endDatetime: data.endDatetime,
        priceAtBooking: data.priceAtBooking,
        status: data.status,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        notes: data.notes,
      },
      include: {
        service: { select: { id: true, name: true } },
        client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
        professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  // Les rendez-vous d'un client, du plus ancien au plus récent (filtre de statut facultatif)
  async findForClient(clientId: number, status?: AppointmentStatusValue, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findMany({
      where: { clientId: clientId, status: status },
      include: {
        service: { select: { id: true, name: true } },
        client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
        professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { startDatetime: "asc" },
    });
  }

  // Les rendez-vous d'un professionnel, du plus ancien au plus récent (filtre de statut facultatif)
  async findForProfessional(professionalId: number, status?: AppointmentStatusValue, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findMany({
      where: { professionalId: professionalId, status: status },
      include: {
        service: { select: { id: true, name: true } },
        client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
        professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { startDatetime: "asc" },
    });
  }

  // Un rendez-vous avec son service, son client et son professionnel (null s'il n'existe pas)
  async findById(id: number, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findUnique({
      where: { id: id },
      include: {
        service: { select: { id: true, name: true } },
        client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
        professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  // Change le statut d'un rendez-vous SEULEMENT s'il a encore le statut attendu.
  // Renvoie 1 si le changement a eu lieu, 0 sinon (le statut avait déjà changé entre-temps).
  async setStatusIfCurrent(
    id: number,
    from: AppointmentStatusValue,
    to: AppointmentStatusValue,
    db?: Prisma.TransactionClient
  ) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    const result = await client.appointment.updateMany({
      where: { id: id, status: from },
      data: { status: to },
    });
    return result.count;
  }

  // Ce qu'il faut pour écrire un email : le rendez-vous avec les noms ET les adresses du client et du professionnel
  async findForNotification(id: number, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.findUnique({
      where: { id: id },
      select: {
        id: true,
        startDatetime: true,
        cancellationReason: true,
        guestName: true,
        service: { select: { name: true } },
        client: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
        professional: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
  }

  // Annule les rendez-vous réservés mais jamais payés dans le délai.
  // Un rendez-vous PENDING est libéré si TOUTES ces conditions sont vraies :
  // - il a été créé avant "createdBefore" (le délai de grâce est passé)
  // - il n'a aucun paiement PAID
  // - il n'a aucun lien de paiement encore valide (PENDING dont l'échéance n'est pas passée)
  // professionalId facultatif : sans lui, on traite tous les professionnels.
  // Renvoie le nombre de rendez-vous libérés.
  async cancelExpiredUnpaid(
    now: Date,
    createdBefore: Date,
    reason: string,
    professionalId?: number,
    db?: Prisma.TransactionClient
  ) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    const result = await client.appointment.updateMany({
      where: {
        status: "PENDING",
        // Un rendez-vous ajouté à la main n'a pas de client et est déjà CONFIRMED : on ne touche qu'aux réservations en ligne
        clientId: { not: null },
        createdAt: { lt: createdBefore },
        ...(professionalId !== undefined ? { professionalId: professionalId } : {}),
        payments: {
          none: {
            OR: [
              { paymentStatus: "PAID" },
              { paymentStatus: "PENDING", expiresAt: { gt: now } },
            ],
          },
        },
      },
      data: { status: "CANCELLED", cancelledAt: now, cancellationReason: reason },
    });
    return result.count;
  }

  // Passe un rendez-vous de PENDING à CONFIRMED (après un paiement réussi).
  // Renvoie le nombre de lignes modifiées : 0 = il n'était plus en attente (annulé, déjà confirmé...).
  async confirmIfPending(id: number, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    const result = await client.appointment.updateMany({
      where: { id: id, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });
    return result.count;
  }

  // Passe un rendez-vous au statut CANCELLED, avec la date et la raison de l'annulation
  async cancel(id: number, cancelledAt: Date, reason: string | null, db?: Prisma.TransactionClient) {
    let client: Prisma.TransactionClient = prisma;
    if (db) {
      client = db;
    }

    return client.appointment.update({
      where: { id: id },
      data: {
        status: "CANCELLED",
        cancelledAt: cancelledAt,
        cancellationReason: reason,
      },
      include: {
        service: { select: { id: true, name: true } },
        client: { select: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
        professional: { select: { specialty: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }
}