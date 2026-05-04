import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUrl, getStripeClient } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe-billing";
import { requireBusinessAccess } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeClient();
    const session = await req.json();
    const businessId = typeof session.businessId === "string" ? session.businessId : "";
    const planId = typeof session.planId === "string" ? session.planId : "";

    if (!businessId || !planId) {
      return NextResponse.json({ error: "businessId and planId are required" }, { status: 400 });
    }

    const authSession = await requireBusinessAccess(businessId);

    const [business, plan] = await Promise.all([
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
      db.subscriptionPlan.findUnique({
        where: { id: planId },
      }),
    ]);

    if (!business) {
      return NextResponse.json({ error: "Business introuvable" }, { status: 404 });
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }

    if (plan.price <= 0) {
      return NextResponse.json({ error: "Le plan gratuit ne passe pas par Stripe Checkout" }, { status: 400 });
    }

    if (!plan.stripePriceId) {
      return NextResponse.json({ error: "Le plan n'est pas configuré avec un Stripe Price ID" }, { status: 400 });
    }

    if (business.subscription?.stripeSubscriptionId && ["active", "trialing", "past_due", "unpaid"].includes(business.subscription.status)) {
      return NextResponse.json({ error: "Ce business possède déjà un abonnement Stripe. Utilisez le portail de facturation." }, { status: 409 });
    }

    const customer = await getOrCreateStripeCustomer({
      businessId: business.id,
      businessName: business.name,
      email: authSession.email,
      existingCustomerId: business.subscription?.stripeCustomerId,
    });

    const baseUrl = getAppUrl(req);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      client_reference_id: business.id,
      success_url: `${baseUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/billing?checkout=canceled`,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: {
        businessId: business.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          businessId: business.id,
          planId: plan.id,
          planPriceId: plan.stripePriceId,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
