import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

// GET /api/restaurant?id=xxx — get restaurant info
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    // Verify access (admin or member)
    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_restaurantId: { userId: session.userId, restaurantId: id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        description: true,
        phone: true,
        website: true,
        isActive: true,
      },
    });

    return NextResponse.json({ restaurant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/restaurant — update restaurant info
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { id, name, address, description, phone, website } = body;

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    // Verify access
    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_restaurantId: { userId: session.userId, restaurantId: id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const restaurant = await db.restaurant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
      },
    });

    return NextResponse.json({ restaurant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
