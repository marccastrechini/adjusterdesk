"use server";

import { redirect } from "next/navigation";
import { getDemoContext } from "@/lib/app-context";
import { resolveAppBaseUrl } from "@/lib/env";
import { withNotice } from "@/lib/notices";
import { requireStripeClient } from "@/lib/stripe";

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
