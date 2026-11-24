import { paymentController } from "@/lib/server/container";

export async function POST(
    req: Request,
    context: { params: Promise<{ accountId: string }> }
) {
    const params = await context.params;
    return paymentController.notify(req, params.accountId);
}
