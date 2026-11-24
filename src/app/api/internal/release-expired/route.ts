import { appointmentController } from "@/lib/server/container";

export async function POST(req: Request) {
    return appointmentController.releaseExpired(req);
}
