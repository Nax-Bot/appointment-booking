import { accountController } from "@/lib/container";

export async function PATCH(req: Request) {
    return accountController.updateProfile(req);
}
