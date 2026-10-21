import { authController } from "@/lib/container";

export async function POST() {
    return authController.logout();
}