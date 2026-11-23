import { paymentController } from "@/lib/container";

export async function POST(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    return paymentController.startPayment(params.id);
}
