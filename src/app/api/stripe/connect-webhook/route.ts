import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { processStripeConnectWebhookEvent } from "@/lib/billing-webhooks";
import { hasStripeSecretKey, requireStripeClient, requireStripeConnectWebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!hasStripeSecretKey()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const stripe = requireStripeClient();
    const webhookSecret = requireStripeConnectWebhookSecret();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    await processStripeConnectWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}