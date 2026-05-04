import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUrl, getStripeClient } from "@/lib/stripe";
import { requireBusinessAccess } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeClient();
    const payload = await req.json();
    const businessId = typeof payload.businessId === "string" ? payload.businessId : "";

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const business = await db.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business introuvable" }, { status: 404 });
    }

    if (!business.subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "Aucun customer Stripe lié à ce business" }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: business.subscription.stripeCustomerId,
      return_url: `${getAppUrl(req)}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
