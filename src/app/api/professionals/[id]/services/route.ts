import { offerController } from "@/lib/container";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return offerController.listByProfessional(params.id);
}