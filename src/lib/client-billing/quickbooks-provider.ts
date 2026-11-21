import { ClientBillingConnectionStatus, type Contact, type Firm, type Invoice } from "@/generated/prisma/client";
import type { ClientBillingProvider } from "./types";
import { quickbooksClientPaymentsEnabled } from "./quickbooks/config";
import { beginQuickBooksConnection, refreshQuickBooksConnection } from "./quickbooks/connection";
import { sendQuickBooksInvoice, syncQuickBooksInvoice } from "./quickbooks/invoices";
import { prisma } from "@/lib/prisma";

export function isQuickBooksFirmReady(
  firm: Pick<Firm, "clientBillingEnabled" | "quickbooksRealmId" | "quickbooksRefreshTokenEnc" | "clientBillingConnectionStatus">,
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(
    quickbooksClientPaymentsEnabled(env) &&
      firm.clientBillingEnabled &&
      firm.quickbooksRealmId &&
      firm.quickbooksRefreshTokenEnc &&
      firm.clientBillingConnectionStatus === ClientBillingConnectionStatus.ACTIVE,
  );
}

function connectionResult(firm: Firm, env: NodeJS.ProcessEnv = process.env) {
  const ready = isQuickBooksFirmReady(firm, env);
  let connectionStatus = firm.clientBillingConnectionStatus;
  if (!firm.quickbooksRealmId || !firm.quickbooksRefreshTokenEnc) {
    connectionStatus = connectionStatus === ClientBillingConnectionStatus.DISABLED ? connectionStatus : ClientBillingConnectionStatus.NOT_STARTED;
  }

  return {
    provider: "quickbooks" as const,
    connectionStatus,
    ready,
  };
}

const quickBooksProvider: ClientBillingProvider = {
  getConnectionStatus(firm: Firm) {
    return connectionResult(firm);
  },
  async createOrResumeConnection(firm: Firm) {
    if (!quickbooksClientPaymentsEnabled()) {
      return null;
    }

    return beginQuickBooksConnection(firm);
  },
  async refreshConnectionStatus(firm: Firm) {
    if (!quickbooksClientPaymentsEnabled()) {
      return connectionResult(firm);
    }

    return refreshQuickBooksConnection(firm);
  },
  isReady(firm: Firm) {
    return isQuickBooksFirmReady(firm);
  },
  async createOrUpdateCustomer(firm: Firm, contact: Contact) {
    void firm;
    return {
      customerId: contact.externalBillingProvider === "quickbooks" ? contact.externalBillingCustomerId : null,
      providerCustomerId: contact.externalBillingProvider === "quickbooks" ? contact.externalBillingCustomerId : null,
      provider: "quickbooks" as const,
    };
  },
  async sendInvoice(firm: Firm, invoice: Invoice) {
    const claim = await prisma.claim.findUnique({
      where: { id: invoice.claimId },
      include: { contact: true },
    });
    if (!claim) {
      throw new Error("Claim not found for invoice.");
    }

    return sendQuickBooksInvoice({ firm, invoice, claim });
  },
  async syncInvoiceStatus(firm: Firm, invoice: Invoice) {
    return syncQuickBooksInvoice(firm, invoice);
  },
  handleWebhook() {
    return;
  },
};

export function createQuickBooksClientBillingProvider() {
  return quickBooksProvider;
}
