import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, deleteSession } from "@/lib/session";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { userId: session.userId },
        select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
        },
    });

    // Compte supprimé alors que le cookie existe encore : on nettoie la session
    if (!user) {
        await deleteSession();
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    return NextResponse.json({ user: { ...user, role: session.role } });
}