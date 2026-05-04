import { NextRequest } from "next/server";
import Stripe from "stripe";

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

export function getStripeClient() {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }

  return globalForStripe.stripe;
}

export function getAppUrl(req?: NextRequest) {
  const configuredUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (!req) {
    throw new Error("APP_URL or NEXT_PUBLIC_APP_URL environment variable is required");
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export function getStripeWebhookSecret() {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}
