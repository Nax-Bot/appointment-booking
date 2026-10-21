import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { jsonError } from "@/lib/http";

// Même nom de cookie que dans lib/session.ts
const SESSION_COOKIE_NAME = "session";

// Routes accessibles sans être connecté
const PUBLIC_PATHS = [
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
];

export async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Les routes publiques passent sans vérification
    if (PUBLIC_PATHS.includes(path)) {
        return NextResponse.next();
    }

    // Toutes les autres routes /api exigent une session valide
    const cookie = req.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie) {
        return jsonError("Vous devez être connecté", 401, []);
    }

    const session = await verifyToken(cookie.value);
    if (session === null) {
        return jsonError("Vous devez être connecté", 401, []);
    }

    return NextResponse.next();
}

// Le proxy ne s'applique qu'aux routes de l'API
export const config = {
    matcher: ["/api/:path*"],
};