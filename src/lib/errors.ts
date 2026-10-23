// Erreur de base de l'application : un message + un code HTTP
export class AppError extends Error {
  public statusCode: number;
  public details: string[];

  constructor(message: string, statusCode: number, details: string[]) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// 404 : la ressource demandée n'existe pas
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, []);
    this.name = "NotFoundError";
  }
}

// 409 : conflit (ex. email déjà utilisé, créneau déjà pris, service déjà existant).
// Les détails sont facultatifs : sans eux, la liste est vide.
export class ConflictError extends AppError {
  constructor(message: string, details: string[] = []) {
    super(message, 409, details);
    this.name = "ConflictError";
  }
}

// 400 : données invalides (on peut donner la liste des problèmes)
export class ValidationError extends AppError {
  constructor(message: string, details: string[]) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

// 401 : pas connecté, ou identifiants incorrects
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401, []);
    this.name = "UnauthorizedError";
  }
}

// 403 : connecté mais pas autorisé (mauvais rôle)
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, []);
    this.name = "ForbiddenError";
  }
}