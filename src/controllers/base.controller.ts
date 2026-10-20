import { ZodType } from "zod";
import { AppError, ValidationError } from "@/lib/errors";
import { jsonOk, jsonCreated, jsonError } from "@/lib/http";

export class BaseController {
  // Lit le corps JSON de la requête. Si le JSON est cassé, on lance une erreur 400.
  protected async readBody(req: Request): Promise<unknown> {
    try {
      const body = await req.json();
      return body;
    } catch (error) {
      throw new ValidationError("Le corps de la requête n'est pas un JSON valide", []);
    }
  }

  // Lit le corps puis le vérifie avec un schéma zod.
  // Si les données sont invalides, on lance une ValidationError avec la liste des problèmes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async readAndValidateBody(req: Request, schema: ZodType): Promise<any> {
    const body = await this.readBody(req);
    const result = schema.safeParse(body);

    if (result.success === false) {
      const details: string[] = [];

      for (const issue of result.error.issues) {
        // On reconstruit le chemin du champ, par exemple "email"
        const pathParts: string[] = [];
        for (const part of issue.path) {
          pathParts.push(String(part));
        }
        const pathText = pathParts.join(".");
        details.push(pathText + " : " + issue.message);
      }

      throw new ValidationError("Données invalides", details);
    }

    return result.data;
  }

  // Réponse 200
  protected ok(data: unknown) {
    return jsonOk(data);
  }

  // Réponse 201
  protected created(data: unknown) {
    return jsonCreated(data);
  }

  // Transforme une erreur en réponse HTTP.
  // - AppError (ou sous-classe) : on utilise son code et son message
  // - autre erreur : on cache les détails et on renvoie 500
  protected handleError(error: unknown) {
    if (error instanceof AppError) {
      return jsonError(error.message, error.statusCode, error.details);
    }

    console.error(error);
    return jsonError("Erreur interne du serveur", 500, []);
  }
}