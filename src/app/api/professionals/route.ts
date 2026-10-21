import { professionalController } from "@/lib/container";

export async function GET() {
    return professionalController.list();
}