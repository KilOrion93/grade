import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/session";
import { getStripeClient } from "@/lib/stripe";
import { syncStripeSubscription } from "@/lib/stripe-billing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const businessId = typeof body.businessId === "string" ? body.businessId : "";

    if (!businessId) {
      return NextResponse.json({ error: "businessId requis" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const business = await db.business.findUnique({
      where: { id: businessId },
      include: { subscription: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business introuvable" }, { status: 404 });
    }

    const stripeSubId = business.subscription?.stripeSubscriptionId;
    if (!stripeSubId) {
      return NextResponse.json({ synced: false, message: "Aucun abonnement Stripe à synchroniser" });
    }

    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    await syncStripeSubscription(stripeSub);

    return NextResponse.json({ synced: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
