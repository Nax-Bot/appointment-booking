import { serviceController } from "@/lib/container";

export async function GET(req: Request) {
    return serviceController.suggest(req);
}

