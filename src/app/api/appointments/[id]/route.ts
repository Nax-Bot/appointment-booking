import { appointmentController } from "@/lib/server/container";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    return appointmentController.getById(params.id);
}