import { NextResponse } from "next/server";
import { getSession, type Role, type SessionPayload } from "@/lib/session";

type AuthResult =
    | { session: SessionPayload; error?: never }
    | { session?: never; error: NextResponse };

// Utilisation dans une route :
//   const { session, error } = await requireSession("CLIENT");
//   if (error) return error;
export async function requireSession(role?: Role): Promise<AuthResult> {
    const session = await getSession();

    if (!session) {
        return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
    }
    if (role && session.role !== role) {
        return { error: NextResponse.json({ error: "Accès interdit" }, { status: 403 }) };
    }
    return { session };
}