import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// Les deux rôles possibles
export type Role = "CLIENT" | "PROFESSIONAL";

// Ce que l'on met dans la session : qui est connecté, et avec quel rôle
export interface SessionData {
  userId: number;
  role: Role;
}

// Lit le secret dans .env et le convertit pour jose
function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET est manquant dans le fichier .env");
  }
  return new TextEncoder().encode(secret);
}

// Transforme un mot de passe en hash (on ne stocke JAMAIS le mot de passe en clair)
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Compare un mot de passe saisi avec le hash enregistré
export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

// Crée un JWT signé, valable 7 jours
export async function createToken(userId: number, role: Role) {
  const token = await new SignJWT({ role: role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());

  return token;
}

// Vérifie un JWT. Renvoie les données de session, ou null si le token est invalide ou expiré
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const result = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    const userId = Number(result.payload.sub);
    const role = result.payload.role;

    if (Number.isNaN(userId)) {
      return null;
    }
    if (role !== "CLIENT" && role !== "PROFESSIONAL") {
      return null;
    }

    return { userId: userId, role: role };
  } catch (error) {
    return null;
  }
}