import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

type Role = "CLIENT" | "PROFESSIONAL";

// On relit le cookie ici directement : next/headers n'est pas utilisable dans le proxy
async function readSession(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    const secret = process.env.AUTH_SECRET;
    if (!token || !secret) return null;

    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
            algorithms: ["HS256"],
        });
        return { userId: payload.userId as number, role: payload.role as Role };
    } catch {
        return null; // token expiré ou falsifié
    }
}

export default async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isApi = pathname.startsWith("/api/");
    const session = await readSession(req);

    // Pas connecté
    if (!session) {
        if (isApi) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Connecté, mais mauvais espace (pages seulement ; les API vérifient leur rôle elles-mêmes)
    if (pathname.startsWith("/dashboard/professional") && session.role !== "PROFESSIONAL") {
        return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }
    if (pathname.startsWith("/dashboard/client") && session.role !== "CLIENT") {
        return NextResponse.redirect(new URL("/dashboard/professional", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/api/appointments/:path*",
        "/api/payments/:path*",
        "/dashboard/:path*",
    ],
};