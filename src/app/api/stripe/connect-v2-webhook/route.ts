import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { processStripeConnectV2AccountNotification } from "@/lib/client-billing/stripe-connect-provider";
import { logClientBillingStripeError } from "@/lib/client-billing/stripe-connect-account";
import { hasStripeSecretKey, requireStripeClient, requireStripeConnectV2WebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!hasStripeSecretKey()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();

  let webhookSecret: string;
  try {
    webhookSecret = requireStripeConnectV2WebhookSecret();
  } catch (error) {
    logClientBillingStripeError("Stripe Connect v2 webhook is not configured.", error);
    return NextResponse.json({ error: "Stripe Connect v2 webhook is not configured." }, { status: 503 });
  }

  try {
    const stripe = requireStripeClient();
    const notification = stripe.parseEventNotification(payload, signature, webhookSecret);
    await processStripeConnectV2AccountNotification(notification);
    return NextResponse.json({ received: true });
  } catch (error) {
    logClientBillingStripeError("Stripe Connect v2 webhook failed.", error);
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
