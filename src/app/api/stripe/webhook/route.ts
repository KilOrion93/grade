import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { logAudit } from "@/lib/audit";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { syncStripeSubscription } from "@/lib/stripe-billing";

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const localSubscription = await syncStripeSubscription(subscription, session.id);

          await logAudit({
            action: "subscription.update",
            entity: "subscription",
            entityId: localSubscription.id,
            metadata: {
              stripeEventType: event.type,
              stripeSubscriptionId: subscription.id,
              stripeCheckoutSessionId: session.id,
            },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const localSubscription = await syncStripeSubscription(subscription);

        await logAudit({
          action: "subscription.update",
          entity: "subscription",
          entityId: localSubscription.id,
          metadata: {
            stripeEventType: event.type,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
          },
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
