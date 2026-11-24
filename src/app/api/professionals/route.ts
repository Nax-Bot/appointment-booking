import { professionalController } from "@/lib/server/container";

export async function GET(req: Request) {
    return professionalController.list(req);
}