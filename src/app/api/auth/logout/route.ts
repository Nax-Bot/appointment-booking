import { authController } from "@/lib/server/container";

export async function POST() {
    return authController.logout();
}