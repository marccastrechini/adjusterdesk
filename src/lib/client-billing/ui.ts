import type { Firm } from "@/generated/prisma/client";

export type ClientPaymentsFirm = Pick<
  Firm,
  | "clientBillingProvider"
  | "stripeConnectAccountId"
  | "clientBillingEnabled"
  | "stripeChargesEnabled"
  | "stripePayoutsEnabled"
  | "stripeDetailsSubmitted"
>;

export function getClientPaymentsPrimaryActionLabel(firm: ClientPaymentsFirm) {
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

export function clientPaymentsSetupPrompt(firm: ClientPaymentsFirm) {
  const action = getClientPaymentsPrimaryActionLabel(firm);
  if (!action) {
    return null;
  }

  if (action === "Resume onboarding") {
    return {
      href: "/settings/client-payments",
      label: "Finish client payments setup",
      message: "Online payment is not finished for this office. Finish Stripe setup before sending a payment request.",
    };
  }

  return {
    href: "/settings/client-payments",
    label: "Set up client payments",
    message: "Online payment is not set up for this office. Connect Stripe to send a payment request from an invoice.",
  };
}
