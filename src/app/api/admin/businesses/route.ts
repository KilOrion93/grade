import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();

    const businesses = await db.business.findMany({
      include: {
        _count: { select: { reviews: true, visitTokens: true } },
        memberships: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ businesses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const business = await db.business.update({
      where: { id },
      data,
    });

    await logAudit({
      userId: session.userId,
      action: "business.update",
      entity: "business",
      entityId: id,
      metadata: data,
    });

    return NextResponse.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await db.business.delete({
      where: { id },
    });

    await logAudit({
      userId: session.userId,
      action: "business.update",
      entity: "business",
      entityId: id,
      metadata: { deleted: true },
    });

    return NextResponse.json({ business: { id, deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { name, address, description, ownerId } = body;

    if (!name || !address) {
      return NextResponse.json({ error: "Nom et adresse requis" }, { status: 400 });
    }

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) slug = "business";

    let uniqueSlug = slug;
    let counter = 1;
    while (true) {
      const exists = await db.business.findUnique({ where: { slug: uniqueSlug } });
      if (!exists) break;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const memberships = ownerId
      ? {
          create: {
            userId: ownerId,
            role: "OWNER" as const,
          },
        }
      : undefined;

    const business = await db.business.create({
      data: {
        name,
        address,
        description,
        slug: uniqueSlug,
        isActive: true,
        memberships: memberships as never,
      },
    });

    await logAudit({
      userId: session.userId,
      action: "business.create",
      entity: "business",
      entityId: business.id,
      metadata: { name, slug: uniqueSlug },
    });

    return NextResponse.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
