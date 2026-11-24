import { availabilityController } from "@/lib/server/container";

export async function GET() {
    return availabilityController.listMine();
}

export async function POST(req: Request) {
    return availabilityController.create(req);
}