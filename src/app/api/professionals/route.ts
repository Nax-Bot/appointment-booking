import { professionalController } from "@/lib/container";

export async function GET(req: Request) {
    return professionalController.list(req);
}