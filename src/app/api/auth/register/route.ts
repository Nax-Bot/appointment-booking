import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const data = parsed.data;

    try {
        const passwordHash = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                passwordHash,
                phoneNumber: data.phoneNumber,

                // Création du profil spécialisé en même temps (XT : un seul des deux)
                ...(
                    data.role === "CLIENT"
                        ? { client: { create: { birthDate: data.birthDate, address: data.address } } }
                        : { professional: { create: { specialty: data.specialty, description: data.description } } }
                ),
            },
            select: { userId: true, firstName: true, lastName: true, email: true },
        });

        await createSession({ userId: user.userId, role: data.role });

        return NextResponse.json({ user: { ...user, role: data.role } }, { status: 201 });
        
    } catch (e) {
        // P2002 = violation de contrainte unique (email déjà pris)
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
        }
        console.error(e);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}