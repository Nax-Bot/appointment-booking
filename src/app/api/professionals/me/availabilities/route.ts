import { availabilityController } from "@/lib/container";

export async function GET() {
    return availabilityController.listMine();
}

export async function POST(req: Request) {
    return availabilityController.create(req);
}