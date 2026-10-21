import { serviceController } from "@/lib/container";

export async function GET() {
    return serviceController.list();
}