import { serviceController } from "@/lib/container";

export async function GET() {
    return serviceController.list();
}

export async function POST(req: Request) {
    return serviceController.create(req);
}