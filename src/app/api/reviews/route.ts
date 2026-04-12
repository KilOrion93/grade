import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
    }

    await requireRestaurantAccess(restaurantId);

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
    const status = req.nextUrl.searchParams.get("status");
    const visibility = req.nextUrl.searchParams.get("visibility");
    const dateFrom = req.nextUrl.searchParams.get("dateFrom");
    const dateTo = req.nextUrl.searchParams.get("dateTo");

    const where: Record<string, unknown> = { restaurantId };
    if (status) where.moderationStatus = status;
    if (visibility) where.visibilityType = visibility;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: { criterionScores: true },
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
        criteria: r.criterionScores.map((cs) => ({
          name: cs.criterionName,
          score: cs.score,
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
