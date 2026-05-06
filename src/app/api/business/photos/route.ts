import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const photo = await db.businessPhoto.findUnique({
      where: { id: photoId },
      select: { businessId: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId: photo.businessId } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    await db.businessPhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
