import { authController } from "@/lib/container";

export async function GET() {
  return authController.me();
}