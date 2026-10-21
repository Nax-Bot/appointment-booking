import { offerController } from "@/lib/container";

export async function PUT(
    req: Request,
    context: { params: Promise<{ serviceId: string }> }
) {
    const params = await context.params;
    return offerController.setMyOffer(req, params.serviceId);
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ serviceId: string }> }
) {
    const params = await context.params;
    return offerController.removeMyOffer(params.serviceId);
}