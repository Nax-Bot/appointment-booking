import { accountController } from "@/lib/server/container";

export async function PATCH(req: Request) {
    return accountController.updateProfile(req);
}
