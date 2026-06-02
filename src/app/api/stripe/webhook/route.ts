import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { logStripeConfigIssue, stripeConfigured } from "@/lib/billing";
import { processStripeWebhookEvent } from "@/lib/billing-webhooks";
import { requireStripeClient, requireStripeWebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    logStripeConfigIssue("POST /api/stripe/webhook");
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const stripe = requireStripeClient();
    const webhookSecret = requireStripeWebhookSecret();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    await processStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
