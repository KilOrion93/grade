import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/session";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Business ID required" }, { status: 400 });
  }

  try {
    await requireBusinessAccess(businessId);

    const [business, plans] = await Promise.all([
      db.business.findUnique({
        where: { id: businessId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
      db.subscriptionPlan.findMany({
        orderBy: { price: "asc" },
      }),
    ]);

    if (!business) {
      return NextResponse.json({ error: "Business introuvable" }, { status: 404 });
    }

    return NextResponse.json({ business, plans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
