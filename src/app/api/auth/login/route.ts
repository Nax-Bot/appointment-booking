import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

// Hash factice : on fait toujours un bcrypt.compare, même si l'email n'existe pas,
// pour que le temps de réponse ne révèle pas quels emails sont inscrits.
const DUMMY_HASH = bcrypt.hashSync("mot-de-passe-factice", 10);

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Email ou mot de passe invalide" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            passwordHash: true,
            client: { select: { userId: true } },
            professional: { select: { userId: true } },
        },
    });

    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    // Même message dans les deux cas : on ne dit pas si c'est l'email ou le mot de passe
    if (!user || !passwordOk) {
        return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const role = user.client ? "CLIENT" : user.professional ? "PROFESSIONAL" : null;
    if (!role) {
        return NextResponse.json({ error: "Profil utilisateur incomplet" }, { status: 403 });
    }

    await createSession({ userId: user.userId, role });

    return NextResponse.json({
        user: {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role,
        },
    });
}