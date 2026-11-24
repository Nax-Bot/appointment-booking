import { authController } from "@/lib/server/container";

export async function GET() {
    return authController.me();
}