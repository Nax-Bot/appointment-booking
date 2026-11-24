import { offerController } from "@/lib/server/container";

export async function GET() {
    return offerController.listMine();
}