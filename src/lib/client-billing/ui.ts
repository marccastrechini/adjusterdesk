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

export function clientBankPaymentsStatus(status: string | null | undefined) {
  switch (status?.trim().toLowerCase()) {
    case "active":
      return {
        label: "Enabled",
        tone: "green" as const,
        detail: "Clients can pay hosted invoices by card or US bank account (ACH). Bank payments stay pending in this office until the debit succeeds.",
      };
    case "pending":
      return {
        label: "Pending",
        tone: "amber" as const,
        detail: "Stripe is reviewing bank payments for this account. Invoices stay cards-only until the capability is active.",
      };
    case "restricted":
      return {
        label: "Action needed",
        tone: "amber" as const,
        detail: "Bank payments need more information in this office's Stripe account. Invoices stay cards-only until Stripe marks the capability active.",
      };
    case "unsupported":
      return {
        label: "Unavailable",
        tone: "slate" as const,
        detail: "This Stripe account cannot accept US bank account payments. Invoices stay cards-only.",
      };
    default:
      return {
        label: "Not enabled",
        tone: "slate" as const,
        detail: "Refresh status to request US bank account payments. Invoices stay cards-only until Stripe marks the capability active.",
      };
  }
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
