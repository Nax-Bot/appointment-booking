import { authController } from "@/lib/server/container";

export async function POST(req: Request) {
  return authController.resendCode(req);
}