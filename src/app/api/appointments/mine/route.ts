import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const where =
    session.role === "CLIENT"
      ? { clientId: session.userId }
      : { professionalId: session.userId };

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startDatetime: "asc" },
    include: { service: { select: { name: true, duration: true } } },
  });

  return NextResponse.json({ appointments });
}

