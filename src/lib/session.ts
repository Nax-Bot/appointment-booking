import { cookies } from "next/headers";
import { createToken, verifyToken, Role, SessionData } from "@/lib/auth";

const COOKIE_NAME = "session";
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

// Crée le JWT et le place dans un cookie httpOnly (invisible pour le JavaScript du navigateur)
export async function createSession(userId: number, role: Role) {
  const token = await createToken(userId, role);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_IN_SECONDS,
  });
}

// Lit le cookie et renvoie la session, ou null si personne n'est connecté
export async function readSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie) {
    return null;
  }

  return verifyToken(cookie.value);
}

// Supprime le cookie (déconnexion)
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}