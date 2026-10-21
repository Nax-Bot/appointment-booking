import { unavailabilityController } from "@/lib/container";

export async function PUT(
    req: Request,
    context: { params: Promise<{ unavailabilityId: string }> }
) {
    const params = await context.params;
    return unavailabilityController.update(req, params.unavailabilityId);
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ unavailabilityId: string }> }
) {
    const params = await context.params;
    return unavailabilityController.remove(params.unavailabilityId);
}