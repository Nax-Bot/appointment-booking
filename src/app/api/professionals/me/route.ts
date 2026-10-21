import { professionalController } from "@/lib/container";

export async function PATCH(req: Request) {
    return professionalController.updateMyProfile(req);
}