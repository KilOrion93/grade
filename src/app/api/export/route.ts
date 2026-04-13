import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json({ error: "businessId requis" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const reviews = await db.review.findMany({
      where: { businessId },
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
        "Content-Disposition": `attachment; filename="avis-${businessId}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
