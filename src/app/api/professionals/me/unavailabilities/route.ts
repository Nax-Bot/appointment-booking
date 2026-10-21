import { unavailabilityController } from "@/lib/container";

export async function GET() {
    return unavailabilityController.listMine();
}

export async function POST(req: Request) {
    return unavailabilityController.create(req);
}