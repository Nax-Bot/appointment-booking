import { accountController } from "@/lib/container";

export async function POST(req: Request) {
    return accountController.resetPassword(req);
}
