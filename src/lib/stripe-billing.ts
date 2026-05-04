import Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

export async function getOrCreateStripeCustomer(params: {
  businessId: string;
  businessName: string;
  email: string;
  existingCustomerId?: string | null;
}) {
  const stripe = getStripeClient();

  if (params.existingCustomerId) {
    const existingCustomer = await stripe.customers.retrieve(params.existingCustomerId);

    if (!("deleted" in existingCustomer) || !existingCustomer.deleted) {
      return existingCustomer;
    }
  }

  return stripe.customers.create({
    email: params.email,
    name: params.businessName,
    metadata: {
      businessId: params.businessId,
    },
  });
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, checkoutSessionId?: string) {
  const existingSubscription = await db.subscription.findUnique({
    where: {
      stripeSubscriptionId: subscription.id,
    },
  });

  let businessId: string | undefined = subscription.metadata.businessId || undefined;

  if (!businessId && existingSubscription) {
    const business = await db.business.findFirst({
      where: {
        subscriptionId: existingSubscription.id,
      },
      select: {
        id: true,
      },
    });

    if (business?.id) {
      businessId = business.id;
    }
  }

  if (!businessId) {
    throw new Error(`Missing businessId metadata for Stripe subscription ${subscription.id}`);
  }

  const stripePriceId = subscription.items.data[0]?.price?.id ?? subscription.metadata.planPriceId ?? null;

  if (!stripePriceId) {
    throw new Error(`Missing Stripe price for subscription ${subscription.id}`);
  }

  const plan = await db.subscriptionPlan.findFirst({
    where: {
      OR: [
        { stripePriceId },
        { id: subscription.metadata.planId || "" },
      ],
    },
  });

  if (!plan) {
    throw new Error(`No subscription plan found for Stripe price ${stripePriceId}`);
  }

  const currentPeriodEndTimestamp = subscription.items.data[0]?.current_period_end;

  const localSubscription = await db.subscription.upsert({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    create: {
      planId: plan.id,
      status: subscription.status,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId,
      stripeCheckoutSessionId: checkoutSessionId || null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEndTimestamp ? new Date(currentPeriodEndTimestamp * 1000) : null,
      startDate: new Date(subscription.start_date * 1000),
      endDate: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
    },
    update: {
      planId: plan.id,
      status: subscription.status,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripePriceId,
      stripeCheckoutSessionId: checkoutSessionId || existingSubscription?.stripeCheckoutSessionId || null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEndTimestamp ? new Date(currentPeriodEndTimestamp * 1000) : null,
      startDate: new Date(subscription.start_date * 1000),
      endDate: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
    },
  });

  await db.business.update({
    where: {
      id: businessId,
    },
    data: {
      subscriptionId: localSubscription.id,
    },
  });

  return localSubscription;
}
