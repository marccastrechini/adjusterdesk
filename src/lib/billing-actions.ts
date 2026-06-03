"use server";

import { redirect } from "next/navigation";
import { getDemoContext } from "@/lib/app-context";
import { resolveAppBaseUrl } from "@/lib/env";
import { withNotice } from "@/lib/notices";
import { requireStripeClient } from "@/lib/stripe";
import { canManageBilling, canStartSubscriptionForStatus } from "@/lib/billing-conversion";
import { parsePlanSlug, stripeConfigured, resolveStripePriceId } from "@/lib/billing";

export async function openBillingPortalForCurrentWorkspace() {
  const { firm } = await getDemoContext();

  if (!firm.billingCustomerId) {
    redirect(withNotice("/settings/billing", "billing-portal-unavailable"));
  }

  const stripe = requireStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: firm.billingCustomerId,
    return_url: `${resolveAppBaseUrl()}/settings/billing`,
  });

  redirect(session.url);
}

/**
 * Creates a Stripe Checkout Session for an existing firm to convert from trial to paid subscription.
 * Called from Settings/Billing when the user intentionally chooses a plan.
 */
export async function startSubscriptionForCurrentWorkspace(rawPlanSlug: string) {
  if (!stripeConfigured()) {
    redirect(withNotice("/settings/billing", "billing-setup-incomplete"));
  }

  const { firm, user, sessionUser } = await getDemoContext();
  if (!canManageBilling({ role: user.role, isSystemAdmin: sessionUser.isSystemAdmin })) {
    redirect(withNotice("/settings/billing", "billing-permission-denied"));
  }

  if (!canStartSubscriptionForStatus(firm.subscriptionStatus)) {
    redirect(withNotice("/settings/billing", "billing-conversion-not-allowed"));
  }

  const planSlug = parsePlanSlug(rawPlanSlug);
  if (!planSlug) {
    redirect(withNotice("/settings/billing", "billing-invalid-plan"));
  }

  const appBaseUrl = resolveAppBaseUrl();
  const priceId = resolveStripePriceId(planSlug);

  if (!priceId) {
    redirect(withNotice("/settings/billing", "billing-setup-incomplete"));
  }

  const stripe = requireStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${appBaseUrl}/settings/billing?notice=subscription-activated`,
    cancel_url: `${appBaseUrl}/settings/billing?notice=subscription-canceled`,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(firm.billingCustomerId ? { customer: firm.billingCustomerId } : { customer_email: firm.email ?? undefined }),
    metadata: {
      firmId: firm.id,
      planSlug,
    },
    subscription_data: {
      metadata: {
        firmId: firm.id,
        planSlug,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    redirect(withNotice("/settings/billing", "billing-setup-incomplete"));
  }

  redirect(session.url);
}
