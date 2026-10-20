import { NextResponse } from "next/server";

// Réponse de succès : code 200 par défaut
export function jsonOk(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

// Réponse après une création : code 201
export function jsonCreated(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

// Réponse d'erreur : un message, un code HTTP et la liste des détails
export function jsonError(message: string, statusCode: number, details: string[]) {
  return NextResponse.json(
    { error: message, details: details },
    { status: statusCode }
  );
}