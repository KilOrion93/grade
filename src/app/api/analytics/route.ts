import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/session";
import { subDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");
    const period = req.nextUrl.searchParams.get("period") || "30";

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
    }

    await requireRestaurantAccess(restaurantId);

    const periodDays = parseInt(period);
    const dateFrom = subDays(new Date(), periodDays);

    // Get reviews for the period
    const reviews = await db.review.findMany({
      where: {
        restaurantId,
        createdAt: { gte: dateFrom },
      },
      include: {
        criterionScores: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Total count
    const totalReviews = await db.review.count({
      where: { restaurantId },
    });

    // Previous period for trend
    const prevFrom = subDays(dateFrom, periodDays);
    const prevReviews = await db.review.findMany({
      where: {
        restaurantId,
        createdAt: { gte: prevFrom, lt: dateFrom },
      },
    });

    // Overall average
    const avgOverall =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length
        : 0;

    const prevAvgOverall =
      prevReviews.length > 0
        ? prevReviews.reduce((sum, r) => sum + r.overallScore, 0) / prevReviews.length
        : 0;

    // By criteria
    const criteriaMap: Record<string, { total: number; count: number }> = {};
    for (const review of reviews) {
      for (const cs of review.criterionScores) {
        if (!criteriaMap[cs.criterionName]) {
          criteriaMap[cs.criterionName] = { total: 0, count: 0 };
        }
        criteriaMap[cs.criterionName].total += cs.score;
        criteriaMap[cs.criterionName].count++;
      }
    }

    const criteriaAverages = Object.entries(criteriaMap).map(([name, data]) => ({
      name,
      average: parseFloat((data.total / data.count).toFixed(2)),
      count: data.count,
    }));

    // Score distribution
    const distribution = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      distribution[r.overallScore - 1]++;
    }

    // Visibility split
    const publicCount = reviews.filter((r) => r.visibilityType === "PUBLIC").length;
    const privateCount = reviews.filter((r) => r.visibilityType === "PRIVATE").length;

    // Daily trend for chart
    const dailyMap: Record<string, { count: number; total: number }> = {};
    for (const r of reviews) {
      const day = r.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { count: 0, total: 0 };
      dailyMap[day].count++;
      dailyMap[day].total += r.overallScore;
    }

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        average: parseFloat((data.total / data.count).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Trend calculation
    const overallTrend =
      prevAvgOverall > 0
        ? parseFloat(
            (((avgOverall - prevAvgOverall) / prevAvgOverall) * 100).toFixed(1)
          )
        : 0;

    const countTrend =
      prevReviews.length > 0
        ? parseFloat(
            (
              ((reviews.length - prevReviews.length) / prevReviews.length) *
              100
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      totalReviews,
      periodReviews: reviews.length,
      avgOverall: parseFloat(avgOverall.toFixed(2)),
      overallTrend,
      countTrend,
      criteriaAverages,
      distribution,
      publicCount,
      privateCount,
      dailyTrend,
      recent: reviews.slice(0, 5).map((r) => ({
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
    });
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
