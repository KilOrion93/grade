import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
    }

    // Verify access
    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: {
          userId_restaurantId: {
            userId: session.userId,
            restaurantId,
          },
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const tokens = await db.visitToken.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        token: true,
        isUsed: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ tokens });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
