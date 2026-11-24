import { serviceController } from "@/lib/server/container";

export async function GET(req: Request) {
    return serviceController.suggest(req);
}

