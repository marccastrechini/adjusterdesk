import { ClientBillingConnectionStatus, ClientBillingProvider, type Firm } from "@/generated/prisma/client";

export type ClientInvoiceProviderChoice = "stripe" | "quickbooks";

export function selectedClientInvoiceProvider(firm: Pick<Firm, "clientBillingProvider">): ClientInvoiceProviderChoice {
  return firm.clientBillingProvider === ClientBillingProvider.QUICKBOOKS ? "quickbooks" : "stripe";
}

export function clientBillingProviderSelection(firm: Firm, choice: ClientInvoiceProviderChoice) {
  if (choice === "quickbooks") {
    const connected = Boolean(firm.quickbooksRealmId && firm.quickbooksRefreshTokenEnc);
    const restricted = connected && firm.clientBillingProvider === ClientBillingProvider.QUICKBOOKS && firm.clientBillingConnectionStatus === ClientBillingConnectionStatus.RESTRICTED;
    return {
      clientBillingProvider: ClientBillingProvider.QUICKBOOKS,
      clientBillingEnabled: connected && !restricted,
      clientBillingConnectionStatus: !connected
        ? ClientBillingConnectionStatus.NOT_STARTED
        : restricted
          ? ClientBillingConnectionStatus.RESTRICTED
          : ClientBillingConnectionStatus.ACTIVE,
    };
  }

  const hasAccount = Boolean(firm.stripeConnectAccountId);
  const active = Boolean(hasAccount && firm.stripeChargesEnabled && firm.stripePayoutsEnabled && firm.stripeDetailsSubmitted);
  const partial = Boolean(hasAccount && (firm.stripeChargesEnabled || firm.stripePayoutsEnabled || firm.stripeDetailsSubmitted));
  return {
    clientBillingProvider: hasAccount ? ClientBillingProvider.STRIPE_CONNECT : ClientBillingProvider.MANUAL,
    clientBillingEnabled: active,
    clientBillingConnectionStatus: !hasAccount
      ? ClientBillingConnectionStatus.NOT_STARTED
      : active
        ? ClientBillingConnectionStatus.ACTIVE
        : partial
          ? ClientBillingConnectionStatus.RESTRICTED
          : ClientBillingConnectionStatus.ONBOARDING,
  };
}
