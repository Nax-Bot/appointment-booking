import { availabilityController } from "@/lib/container";

export async function PUT(
    req: Request,
    context: { params: Promise<{ availabilityId: string }> }
) {
    const params = await context.params;
    return availabilityController.update(req, params.availabilityId);
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ availabilityId: string }> }
) {
    const params = await context.params;
    return availabilityController.remove(params.availabilityId);
}