import { ZodType } from "zod";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
} from "@/lib/errors";
import { jsonOk, jsonCreated, jsonError } from "@/lib/http";
import { readSession } from "@/lib/session";
import { Role, SessionData } from "@/lib/auth";
import { idParamSchema } from "@/validations/common.validation";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async readAndValidateBody(req: Request, schema: ZodType): Promise<any> {
    const body = await this.readBody(req);
    return this.validate(body, schema);
  }

  // Lit les paramètres de l'URL (?status=PENDING...) puis les vérifie avec un schéma zod.
  // Les paramètres arrivent toujours sous forme de texte.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readAndValidateQuery(req: Request, schema: ZodType): any {
    const url = new URL(req.url);
    const query: { [key: string]: string } = {};

    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }

    return this.validate(query, schema);
  }

  // Transforme un identifiant reçu dans l'URL (texte) en nombre.
  // Si ce n'est pas un entier positif, on lance une erreur 400.
  protected parseId(idText: string): number {
    const result = idParamSchema.safeParse(idText);

    if (result.success === false) {
      throw new ValidationError("Identifiant invalide", [result.error.issues[0].message]);
    }

    return Number(result.data);
  }

  // Lit l'adresse IP du client, ou null si on ne peut pas la lire de façon raisonnable.
  // ATTENTION : l'en-tête x-forwarded-for n'est fiable que derrière un serveur de confiance
  // (l'hébergeur en production). Sans lui, un client peut écrire n'importe quoi.
  protected getClientIp(req: Request): string | null {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded !== null) {
      // Il peut y avoir plusieurs adresses séparées par des virgules : la première est celle du client
      const first = forwarded.split(",")[0].trim();
      if (first !== "" && first.length <= 64) {
        return first;
      }
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp !== null) {
      const cleaned = realIp.trim();
      if (cleaned !== "" && cleaned.length <= 64) {
        return cleaned;
      }
    }

    return null;
  }

  // Exige une personne connectée. Si un rôle est demandé, exige aussi ce rôle.
  // Renvoie la session (userId et rôle) pour que le controller l'utilise.
  protected async requireSession(role?: Role): Promise<SessionData> {
    const session = await readSession();

    if (session === null) {
      throw new UnauthorizedError("Vous devez être connecté");
    }

    if (role !== undefined && session.role !== role) {
      throw new ForbiddenError("Vous n'avez pas le droit d'accéder à cette ressource");
    }

    return session;
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
  //   (et l'en-tête Retry-After pour une erreur 429 qui connaît son temps d'attente)
  // - autre erreur : on cache les détails et on renvoie 500
  protected handleError(error: unknown) {
    if (error instanceof AppError) {
      let headers: Record<string, string> | undefined = undefined;

      if (error instanceof TooManyRequestsError && error.retryAfterSeconds !== null) {
        headers = { "Retry-After": String(error.retryAfterSeconds) };
      }

      return jsonError(error.message, error.statusCode, error.details, headers);
    }

    console.error(error);
    return jsonError("Erreur interne du serveur", 500, []);
  }

  // Vérifie des données avec un schéma zod.
  // Si elles sont invalides, on lance une ValidationError avec la liste des problèmes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validate(data: unknown, schema: ZodType): any {
    const result = schema.safeParse(data);

    if (result.success === false) {
      const details: string[] = [];

      for (const issue of result.error.issues) {
        // On reconstruit le chemin du champ, par exemple "status"
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
}