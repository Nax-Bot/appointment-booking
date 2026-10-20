import { z } from "zod";
import { BaseController } from "@/controllers/base.controller";
import { NotFoundError } from "@/lib/errors";

const testSchema = z.object({
    name: z.string().min(2),
});

export class TestController extends BaseController {
    async hello(req: Request) {
        try {
            const data = await this.readAndValidateBody(req, testSchema);

            if (data.name === "inconnu") {
                throw new NotFoundError("Ce nom n'existe pas");
            }

            return this.ok({ message: "Bonjour " + data.name });
        } catch (error) {
            return this.handleError(error);
        }
    }
}