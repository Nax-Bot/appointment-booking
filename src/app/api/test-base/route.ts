import { TestController } from "@/test/controller/test.controller";

// Temporaire : normalement le new se fait seulement dans lib/container.ts
const testController = new TestController();

export async function POST(req: Request) {
  return testController.hello(req);
}