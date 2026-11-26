import { accountController } from "@/lib/server/container";

export async function POST(req: Request) {
    return accountController.changePassword(req);
}
