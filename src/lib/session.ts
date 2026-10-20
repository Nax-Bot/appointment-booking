import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 jours

export type Role = "CLIENT" | "PROFESSIONAL";
export type SessionPayload = { userId: number; role: Role };

function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET manquant dans .env");
    return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getSecret());

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: MAX_AGE_SECONDS,
    });
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getSecret(), {
            algorithms: ["HS256"],
        });
        return {
            userId: payload.userId as number,
            role: payload.role as Role,
        };
    } catch {
        return null; // token expiré ou falsifié
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}