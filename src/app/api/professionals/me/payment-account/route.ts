import { paymentController } from "@/lib/server/container";

export async function GET() {
    return paymentController.getAccountStatus();
}

export async function PUT(req: Request) {
    return paymentController.setupAccount(req);
}
