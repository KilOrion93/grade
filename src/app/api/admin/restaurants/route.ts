import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// GET /api/admin/restaurants
export async function GET() {
  try {
    await requireAdmin();

    const restaurants = await db.restaurant.findMany({
      include: {
        _count: { select: { reviews: true, visitTokens: true } },
        memberships: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ restaurants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH /api/admin/restaurants - update restaurant
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const restaurant = await db.restaurant.update({
      where: { id },
      data,
    });

    await logAudit({
      userId: session.userId,
      action: "restaurant.update",
      entity: "restaurant",
      entityId: id,
      metadata: data,
    });

    return NextResponse.json({ restaurant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/restaurants - delete restaurant
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await db.restaurant.delete({
      where: { id },
    });

    await logAudit({
      userId: session.userId,
      action: "restaurant.update",
      entity: "restaurant",
      entityId: id,
      metadata: { deleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/restaurants - create restaurant
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { name, address, description, ownerId } = body;

    if (!name || !address) {
      return NextResponse.json({ error: "Nom et adresse requis" }, { status: 400 });
    }

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) slug = "restaurant";
    
    let uniqueSlug = slug;
    let counter = 1;
    while (true) {
      const exists = await db.restaurant.findUnique({ where: { slug: uniqueSlug } });
      if (!exists) break;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const memberships = ownerId ? {
      create: {
        userId: ownerId,
        role: "OWNER",
      }
    } : undefined;

    const restaurant = await db.restaurant.create({
      data: {
        name,
        address,
        description,
        slug: uniqueSlug,
        isActive: true,
        memberships: memberships as any
      },
    });

    await logAudit({
      userId: session.userId,
      action: "restaurant.create",
      entity: "restaurant",
      entityId: restaurant.id,
      metadata: { name, slug: uniqueSlug },
    });

    return NextResponse.json({ restaurant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
