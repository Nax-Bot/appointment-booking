// Le container : le SEUL endroit où l'on fait des "new".
// Ordre : repositories, puis services, puis controllers.

import { UserRepository } from "@/repositories/user.repository";
import { ServiceRepository } from "@/repositories/service.repository";
import { ProfessionalRepository } from "@/repositories/professional.repository";
import { OfferRepository } from "@/repositories/offer.repository";
import { AvailabilityRepository } from "@/repositories/availability.repository";
import { UnavailabilityRepository } from "@/repositories/unavailability.repository";
import { AppointmentRepository } from "@/repositories/appointment.repository";
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

// Repositories
const userRepository = new UserRepository();
const serviceRepository = new ServiceRepository();
const professionalRepository = new ProfessionalRepository();
const offerRepository = new OfferRepository();
const availabilityRepository = new AvailabilityRepository();
const unavailabilityRepository = new UnavailabilityRepository();
const appointmentRepository = new AppointmentRepository();

// Services
const authService = new AuthService(userRepository);
const serviceService = new ServiceService(serviceRepository);
const professionalService = new ProfessionalService(professionalRepository);
const offerService = new OfferService(offerRepository, professionalRepository, serviceRepository);
const availabilityService = new AvailabilityService(availabilityRepository, professionalRepository);
const unavailabilityService = new UnavailabilityService(unavailabilityRepository, professionalRepository);
const appointmentService = new AppointmentService(
    appointmentRepository,
    professionalRepository,
    offerRepository,
    availabilityRepository,
    unavailabilityRepository
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