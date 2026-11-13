import { authController } from "@/lib/container";

export async function POST(req: Request) {
  return authController.resendCode(req);
}