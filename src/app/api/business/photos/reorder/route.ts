import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { businessId, photoIds } = body as { businessId: string; photoIds: string[] };

    if (!businessId || !Array.isArray(photoIds)) {
      return NextResponse.json({ error: "businessId et photoIds requis" }, { status: 400 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    await Promise.all(
      photoIds.map((id, index) =>
        db.businessPhoto.update({ where: { id }, data: { order: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
