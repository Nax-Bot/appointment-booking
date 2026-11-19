// Le container : le SEUL endroit où l'on fait des "new".
// Ordre : repositories, puis services, puis controllers.

import { UserRepository } from "@/repositories/user.repository";
import { EmailVerificationRepository } from "@/repositories/email-verification.repository";
import { RateLimitRepository } from "@/repositories/rate-limit.repository";
import { ServiceRepository } from "@/repositories/service.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { OfferRepository } from "@/repositories/offer.repository";
import { AvailabilityRepository } from "@/repositories/availability.repository";
import { UnavailabilityRepository } from "@/repositories/unavailability.repository";
import { AppointmentRepository } from "@/repositories/appointment.repository";
import { PrismaTransactionRunner } from "@/lib/transaction-runner";

import { ConsoleEmailSender, EmailSender } from "@/lib/email-sender";
import { SmtpEmailSender } from "@/lib/smtp-email-sender";
import { readSmtpConfig } from "@/lib/smtp-config";
import { RateLimitService } from "@/services/rate-limit.service";
import { AuthService } from "@/services/auth.service";
import { ServiceService } from "@/services/service.service";
import { ProfessionalService } from "@/services/professional.service";
import { OfferService } from "@/services/offer.service";
import { AvailabilityService } from "@/services/availability.service";
import { UnavailabilityService } from "@/services/unavailability.service";
import { AppointmentService } from "@/services/appointment.service";
import { SlotService } from "@/services/slot.service";
import { AuthController } from "@/controllers/auth.controller";
import { ServiceController } from "@/controllers/service.controller";
import { ProfessionalController } from "@/controllers/professional.controller";
import { OfferController } from "@/controllers/offer.controller";
import { AvailabilityController } from "@/controllers/availability.controller";
import { UnavailabilityController } from "@/controllers/unavailability.controller";
import { AppointmentController } from "@/controllers/appointment.controller";
import { SlotController } from "@/controllers/slot.controller";

// La vérification d'email est TOUJOURS exigée, sauf en développement si .env contient
// REQUIRE_EMAIL_VERIFICATION=false (pratique pour les scripts de test). En production, ce réglage est ignoré.
let requireEmailVerification = true;
if (process.env.NODE_ENV !== "production" && process.env.REQUIRE_EMAIL_VERIFICATION === "false") {
    requireEmailVerification = false;
}

// L'envoyeur d'emails :
// - EMAIL_SENDER=smtp dans .env : un vrai envoi par SMTP (Gmail, Brevo, Ethereal...)
// - sinon : un faux qui affiche le code dans la console (développement seulement, refusé en production)
let emailSender: EmailSender;
if (process.env.EMAIL_SENDER === "smtp") {
    emailSender = new SmtpEmailSender(readSmtpConfig(process.env));
} else {
    emailSender = new ConsoleEmailSender(process.env.NODE_ENV === "production");
}

// Repositories
const userRepository = new UserRepository();
const emailVerificationRepository = new EmailVerificationRepository();
const rateLimitRepository = new RateLimitRepository();
const serviceRepository = new ServiceRepository();
const professionalRepository = new ProfessionalRepository();
const offerRepository = new OfferRepository();
const availabilityRepository = new AvailabilityRepository();
const unavailabilityRepository = new UnavailabilityRepository();
const appointmentRepository = new AppointmentRepository();

// Le moteur de transactions
const transactionRunner = new PrismaTransactionRunner();

// Services
const rateLimitService = new RateLimitService(rateLimitRepository);
const authService = new AuthService(
    userRepository,
    emailVerificationRepository,
    emailSender,
    requireEmailVerification,
    rateLimitService
);
const serviceService = new ServiceService(serviceRepository, professionalRepository);
const professionalService = new ProfessionalService(professionalRepository, serviceRepository);
const offerService = new OfferService(offerRepository, professionalRepository, serviceRepository);
const availabilityService = new AvailabilityService(availabilityRepository, professionalRepository, appointmentRepository);
const unavailabilityService = new UnavailabilityService(unavailabilityRepository, professionalRepository, appointmentRepository);
const appointmentService = new AppointmentService(
    appointmentRepository,
    professionalRepository,
    offerRepository,
    availabilityRepository,
    unavailabilityRepository,
    transactionRunner
);
const slotService = new SlotService(
    professionalRepository,
    offerRepository,
    availabilityRepository,
    unavailabilityRepository,
    appointmentRepository
);

// Controllers (les seuls objets exportés)
export const authController = new AuthController(authService);
export const serviceController = new ServiceController(serviceService);
export const professionalController = new ProfessionalController(professionalService);
export const offerController = new OfferController(offerService);
export const availabilityController = new AvailabilityController(availabilityService);
export const unavailabilityController = new UnavailabilityController(unavailabilityService);
export const appointmentController = new AppointmentController(appointmentService);
export const slotController = new SlotController(slotService);