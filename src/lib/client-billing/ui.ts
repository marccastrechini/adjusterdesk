import type { Firm } from "@/generated/prisma/client";

export function getClientPaymentsPrimaryActionLabel(firm: Firm) {
  const hasStripeConnectAccount = Boolean(firm.stripeConnectAccountId);
  const hasActiveStripeConnection =
    firm.clientBillingProvider === "STRIPE_CONNECT" &&
    hasStripeConnectAccount &&
    firm.clientBillingEnabled &&
    firm.stripeChargesEnabled &&
    firm.stripePayoutsEnabled &&
    firm.stripeDetailsSubmitted;

  if (hasActiveStripeConnection) {
    return null;
  }

  if (firm.clientBillingProvider === "STRIPE_CONNECT" && hasStripeConnectAccount) {
    return "Resume onboarding";
  }

  return "Connect Stripe";
}
