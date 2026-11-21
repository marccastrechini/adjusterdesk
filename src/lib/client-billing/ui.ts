import type { Firm } from "@/generated/prisma/client";

export type ClientPaymentsFirm = Pick<
  Firm,
  | "clientBillingProvider"
  | "stripeConnectAccountId"
  | "clientBillingEnabled"
  | "stripeChargesEnabled"
  | "stripePayoutsEnabled"
  | "stripeDetailsSubmitted"
  | "quickbooksRealmId"
  | "quickbooksRefreshTokenEnc"
>;

export function getClientPaymentsPrimaryActionLabel(firm: ClientPaymentsFirm) {
  if (firm.clientBillingProvider === "QUICKBOOKS") {
    const connected = Boolean(firm.quickbooksRealmId && firm.quickbooksRefreshTokenEnc && firm.clientBillingEnabled);
    if (connected) {
      return null;
    }

    return firm.quickbooksRealmId ? "Reconnect QuickBooks" : "Connect QuickBooks";
  }

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

  if (action === "Reconnect QuickBooks") {
    return {
      href: "/settings/client-payments",
      label: action,
      message: "QuickBooks needs to be reconnected before this office can send a fee invoice.",
    };
  }

  if (action === "Connect QuickBooks") {
    return {
      href: "/settings/client-payments",
      label: action,
      message: "Online payment is not set up for this office. Connect QuickBooks to email a fee invoice with a pay link.",
    };
  }

  return {
    href: "/settings/client-payments",
    label: "Set up client payments",
    message: "Online payment is not set up for this office. Connect Stripe to send a payment request from an invoice.",
  };
}
