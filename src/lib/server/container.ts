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
import { PasswordResetRepository } from "@/repositories/password-reset.repository";
import { AccountService } from "@/services/account.service";
import { AccountController } from "@/controllers/account.controller";
import { PaymentAccountRepository } from "@/repositories/payment-account.repository";
import { PaymentRepository } from "@/repositories/payment.repository";
import { PrismaTransactionRunner } from "@/lib/server/db/transaction-runner";
import { PapiGateway } from "@/lib/server/payments/papi-gateway";
import { FakePaymentGateway } from "@/lib/server/payments/fake-gateway";
import { PaymentGateway } from "@/lib/server/payments/payment-gateway";
import { PaymentService } from "@/services/payment.service";
import { PaymentController } from "@/controllers/payment.controller";

import { ConsoleEmailSender, EmailSender } from "@/lib/server/email/email-sender";
import { SmtpEmailSender } from "@/lib/server/email/smtp-email-sender";
import { readSmtpConfig } from "@/lib/server/email/smtp-config";
import { RateLimitService } from "@/services/rate-limit.service";
import { AuthService } from "@/services/auth.service";
import { ServiceService } from "@/services/service.service";
import { ProfessionalService } from "@/services/professional.service";
import { OfferService } from "@/services/offer.service";
import { AvailabilityService } from "@/services/availability.service";
import { UnavailabilityService } from "@/services/unavailability.service";
import { AppointmentNotifier } from "@/services/appointment-notifier.service";
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

const passwordResetRepository = new PasswordResetRepository();
const paymentAccountRepository = new PaymentAccountRepository();
const paymentRepository = new PaymentRepository();

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
const accountService = new AccountService(userRepository, passwordResetRepository, rateLimitService, emailSender);
const serviceService = new ServiceService(serviceRepository, professionalRepository);
const professionalService = new ProfessionalService(professionalRepository, serviceRepository);
const offerService = new OfferService(offerRepository, professionalRepository, serviceRepository);
const availabilityService = new AvailabilityService(availabilityRepository, professionalRepository, appointmentRepository);
const unavailabilityService = new UnavailabilityService(unavailabilityRepository, professionalRepository, appointmentRepository);
const appointmentNotifier = new AppointmentNotifier(appointmentRepository, emailSender);
const appointmentService = new AppointmentService(
    appointmentRepository,
    professionalRepository,
    offerRepository,
    availabilityRepository,
    unavailabilityRepository,
    transactionRunner,
    appointmentNotifier
);
const slotService = new SlotService(
    professionalRepository,
    offerRepository,
    availabilityRepository,
    unavailabilityRepository,
    appointmentRepository
);

// Paiement en ligne : PAYMENT_GATEWAY=fake dans .env utilise une fausse passerelle (sans Papi)
let paymentGateway: PaymentGateway = new PapiGateway();
if (process.env.PAYMENT_GATEWAY === "fake" && process.env.NODE_ENV !== "production") {
    paymentGateway = new FakePaymentGateway();
}
const paymentService = new PaymentService(
    paymentAccountRepository,
    paymentRepository,
    appointmentRepository,
    transactionRunner,
    paymentGateway,
    {
        // APP_PUBLIC_URL : l'adresse publique de l'application (en test : celle du tunnel)
        publicBaseUrl: (process.env.APP_PUBLIC_URL ?? "").replace(/\/+$/, ""),
        successUrl: process.env.PAYMENT_SUCCESS_URL || undefined,
        failureUrl: process.env.PAYMENT_FAILURE_URL || undefined,
    },
    appointmentNotifier
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
export const paymentController = new PaymentController(paymentService);
export const accountController = new AccountController(accountService);
