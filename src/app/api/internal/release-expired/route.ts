import { appointmentController } from "@/lib/container";

export async function POST(req: Request) {
    return appointmentController.releaseExpired(req);
}
