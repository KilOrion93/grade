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

    const reviews = await db.review.findMany({
      where: { restaurantId },
      include: { criterionScores: true },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Date",
      "Note globale",
      "Accueil",
      "Hygiène",
      "Rapidité",
      "Prix",
      "Qualité",
      "Commentaire",
      "Visibilité",
      "Statut",
      "Score confiance",
    ];

    const rows = reviews.map((r) => {
      const criteria: Record<string, number> = {};
      for (const cs of r.criterionScores) {
        criteria[cs.criterionName] = cs.score;
      }

      return [
        r.createdAt.toISOString().slice(0, 19).replace("T", " "),
        r.overallScore,
        criteria.accueil || "",
        criteria.hygiene || "",
        criteria.rapidite || "",
        criteria.prix || "",
        criteria.qualite || "",
        `"${(r.comment || "").replace(/"/g, '""')}"`,
        r.visibilityType,
        r.moderationStatus,
        r.trustScore,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="avis-${restaurantId}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
