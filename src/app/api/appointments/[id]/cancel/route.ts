import { appointmentController } from "@/lib/container";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    return appointmentController.cancel(req, params.id);
}