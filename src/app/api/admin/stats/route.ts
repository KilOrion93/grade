import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeSubscriptions,
      businesses,
      reviewsTotal,
      reviewsToday,
      pendingReviews,
    ] = await Promise.all([
      db.subscription.findMany({
        where: { status: { in: ["active", "trialing"] } },
        include: { plan: true },
      }),
      db.business.count(),
      db.review.count(),
      db.review.count({ where: { createdAt: { gte: startOfToday } } }),
      db.review.count({ where: { moderationStatus: "PENDING" } }),
    ]);

    const mrr = activeSubscriptions.reduce((sum, sub) => sum + (sub.plan?.price ?? 0), 0);
    const activeSubscriberCount = activeSubscriptions.length;

    // Group by plan
    const byPlan: Record<string, { name: string; count: number; mrr: number }> = {};
    for (const sub of activeSubscriptions) {
      const name = sub.plan?.name ?? "Inconnu";
      if (!byPlan[name]) byPlan[name] = { name, count: 0, mrr: 0 };
      byPlan[name].count++;
      byPlan[name].mrr += sub.plan?.price ?? 0;
    }

    return NextResponse.json({
      mrr,
      activeSubscriberCount,
      subscribersByPlan: Object.values(byPlan),
      businesses,
      reviewsTotal,
      reviewsToday,
      pendingReviews,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
