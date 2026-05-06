import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const patchProfileSchema = z.object({
  name: z.string().min(1, "Le nom ne peut pas être vide").max(100),
});

// GET /api/profile — get current user info
export async function GET() {
  try {
    const session = await requireSession();
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/profile — update current user name
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = patchProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: session.userId },
      data: { name: parsed.data.name },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
