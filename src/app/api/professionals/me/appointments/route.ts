import { AppointmentController } from "@/controllers/appointment.controller";
import { appointmentController } from "@/lib/container";

export async function POST(req: Request) {
    return appointmentController.createManual(req);
}