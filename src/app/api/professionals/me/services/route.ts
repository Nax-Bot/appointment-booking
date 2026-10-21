import { offerController } from "@/lib/container";

export async function GET() {
    return offerController.listMine();
}