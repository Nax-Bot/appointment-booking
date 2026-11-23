import type { AppointmentRepository } from "@/repositories/appointment.repository";
import type { EmailSender } from "@/lib/email-sender";
import {
    buildAppointmentConfirmedEmail,
    buildAppointmentCancelledEmail,
    type AppointmentEmailInfo,
} from "@/lib/email-templates";

// Qui a annulé un rendez-vous
export type CancelledBy = "CLIENT" | "PROFESSIONAL" | "SYSTEM";

// Envoie les emails liés aux rendez-vous.
// RÈGLE IMPORTANTE : un email qui échoue ne doit JAMAIS faire échouer l'opération principale
// (un paiement reçu reste valable même si le serveur d'emails est en panne). Les erreurs sont seulement affichées.
export class AppointmentNotifier {
    constructor(
        private appointmentRepository: AppointmentRepository,
        private emailSender: EmailSender
    ) {}

    async notifyConfirmed(appointmentId: number): Promise<void> {
        try {
            const data = await this.load(appointmentId);
            if (data === null) return;

            await this.emailSender.sendNotification(data.clientEmail, buildAppointmentConfirmedEmail(data.info, "CLIENT"));
            await this.emailSender.sendNotification(data.professionalEmail, buildAppointmentConfirmedEmail(data.info, "PROFESSIONAL"));
        } catch (error) {
            console.error("[email] confirmation de rendez-vous non envoyée", appointmentId, error);
        }
    }

    async notifyCancelled(appointmentId: number, cancelledBy: CancelledBy): Promise<void> {
        try {
            const data = await this.load(appointmentId);
            if (data === null) return;

            // On ne prévient pas la personne qui vient d'annuler elle-même
            if (cancelledBy !== "CLIENT") {
                await this.emailSender.sendNotification(data.clientEmail, buildAppointmentCancelledEmail(data.info, "CLIENT", cancelledBy));
            }
            if (cancelledBy !== "PROFESSIONAL") {
                await this.emailSender.sendNotification(data.professionalEmail, buildAppointmentCancelledEmail(data.info, "PROFESSIONAL", cancelledBy));
            }
        } catch (error) {
            console.error("[email] annulation de rendez-vous non envoyée", appointmentId, error);
        }
    }

    // Charge le rendez-vous. Renvoie null s'il n'y a personne à prévenir côté client (rendez-vous d'invité).
    private async load(appointmentId: number) {
        const row = await this.appointmentRepository.findForNotification(appointmentId);
        if (!row || !row.client) {
            return null;
        }

        const info: AppointmentEmailInfo = {
            appointmentId: row.id,
            serviceName: row.service.name,
            startDatetime: row.startDatetime,
            professionalName: row.professional.user.firstName + " " + row.professional.user.lastName,
            clientName: row.client.user.firstName + " " + row.client.user.lastName,
            reason: row.cancellationReason,
        };
        return { info, clientEmail: row.client.user.email, professionalEmail: row.professional.user.email };
    }
}
