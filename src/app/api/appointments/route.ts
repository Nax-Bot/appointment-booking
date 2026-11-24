import { appointmentController } from "@/lib/server/container";

export async function GET(req: Request) {
    return appointmentController.listMine(req);
}

export async function POST(req: Request) {
    return appointmentController.create(req);
}