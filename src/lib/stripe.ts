import Stripe from "stripe";
import { resolveStripePriceId, type PublicPlanSlug } from "@/lib/billing";

let stripeClient: Stripe | null = null;

export function hasStripeSecretKey() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function requireStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-05-27.dahlia",
      appInfo: {
        name: "AdjusterDesk",
      },
    });
  }

  return stripeClient;
}

export function requireStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  return webhookSecret;
}

export function requireStripeConnectWebhookSecret() {
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("Stripe Connect webhook secret is not configured.");
  }

  return webhookSecret;
}

export function requireStripePriceId(planSlug: PublicPlanSlug) {
  const priceId = resolveStripePriceId(planSlug);
  if (!priceId) {
    throw new Error(`Stripe price id is missing for ${planSlug}.`);
  }

  return priceId;
}
