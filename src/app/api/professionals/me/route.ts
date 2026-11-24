import { professionalController } from "@/lib/server/container";

export async function PATCH(req: Request) {
    return professionalController.updateMyProfile(req);
}