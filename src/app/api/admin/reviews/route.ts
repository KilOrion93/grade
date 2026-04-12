import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const status = req.nextUrl.searchParams.get("status");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = 20;

    const where: Record<string, unknown> = {};
    if (status) where.moderationStatus = status;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          restaurant: { select: { name: true, slug: true } },
          criterionScores: true,
          flags: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        overallScore: r.overallScore,
        comment: r.comment,
        visibilityType: r.visibilityType,
        moderationStatus: r.moderationStatus,
        trustScore: r.trustScore,
        createdAt: r.createdAt,
        restaurantName: r.restaurant.name,
        restaurantSlug: r.restaurant.slug,
        criteria: r.criterionScores.map((cs) => ({
          name: cs.criterionName,
          score: cs.score,
        })),
        flagCount: r.flags.length,
        flagReasons: r.flags.map(f => f.reason),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { id, moderationStatus, flagReason } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    if (moderationStatus) {
      await db.review.update({
        where: { id },
        data: { moderationStatus },
      });

      await logAudit({
        userId: session.userId,
        action: "review.moderate",
        entity: "review",
        entityId: id,
        metadata: { newStatus: moderationStatus },
      });
    }

    if (flagReason) {
      await db.reviewFlag.create({
        data: { reviewId: id, reason: flagReason },
      });

      await logAudit({
        userId: session.userId,
        action: "review.flag",
        entity: "review",
        entityId: id,
        metadata: { reason: flagReason },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
