import { ClientBillingConnectionStatus, ClientBillingProvider as ClientBillingProviderEnum, type Contact, type Firm, type Invoice } from "@/generated/prisma/client";
import { createManualClientBillingProvider } from "./manual-provider";
import type { ClientBillingProvider, ClientBillingProviderName } from "./types";
import { createStripeConnectClientBillingProvider } from "./stripe-connect-provider";

const providers: Record<ClientBillingProviderName, ClientBillingProvider> = {
  manual: createManualClientBillingProvider(),
  stripe_connect: createStripeConnectClientBillingProvider(),
};

function normalizeProvider(value: string | null | undefined): ClientBillingProviderName {
  const normalized = value?.trim().toLowerCase();
  return normalized === "stripe_connect" ? "stripe_connect" : "manual";
}

export function getClientBillingProviderName(firm: Firm): ClientBillingProviderName {
  return normalizeProvider(firm.clientBillingProvider);
}

export function getClientBillingProvider(firm: Firm) {
  return providers[getClientBillingProviderName(firm)];
}

export function getClientBillingConnectionStatus(firm: Firm) {
  return getClientBillingProvider(firm).getConnectionStatus(firm);
}

export function isClientBillingReady(firm: Firm) {
  return getClientBillingProvider(firm).isReady(firm);
}

export async function createOrResumeClientBillingConnection(firm: Firm) {
  return getClientBillingProvider(firm).createOrResumeConnection(firm);
}

export async function refreshClientBillingConnectionStatus(firm: Firm) {
  return getClientBillingProvider(firm).refreshConnectionStatus(firm);
}

export async function createOrUpdateClientBillingCustomer(firm: Firm, contact: Contact) {
  return getClientBillingProvider(firm).createOrUpdateCustomer(firm, contact);
}

export async function sendClientBillingInvoice(firm: Firm, invoice: Invoice) {
  return getClientBillingProvider(firm).sendInvoice(firm, invoice);
}

export async function syncClientBillingInvoiceStatus(firm: Firm, invoice: Invoice) {
  return getClientBillingProvider(firm).syncInvoiceStatus(firm, invoice);
}

export async function handleClientBillingWebhook(event: unknown) {
  await Promise.all(Object.values(providers).map((provider) => provider.handleWebhook(event)));
}

export function clientBillingConnectionReadyStatus(firm: Firm): ClientBillingConnectionStatus {
  const status = firm.clientBillingConnectionStatus;
  if (firm.clientBillingProvider !== ClientBillingProviderEnum.STRIPE_CONNECT) {
    return status;
  }

  if (firm.stripeConnectAccountId && firm.clientBillingEnabled) {
    return ClientBillingConnectionStatus.ACTIVE;
  }

  return status;
}
