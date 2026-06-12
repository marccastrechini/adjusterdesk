import type { Contact, Firm, Invoice } from "@/generated/prisma/client";
import type { ClientBillingProvider } from "./types";

const manualProvider: ClientBillingProvider = {
  getConnectionStatus(firm: Firm) {
    return {
      provider: "manual",
      connectionStatus: firm.clientBillingConnectionStatus,
      ready: false,
    };
  },
  async createOrResumeConnection() {
    return null;
  },
  async refreshConnectionStatus(firm: Firm) {
    return {
      provider: "manual",
      connectionStatus: firm.clientBillingConnectionStatus,
      ready: false,
    };
  },
  isReady() {
    return false;
  },
  async createOrUpdateCustomer(_firm: Firm, _contact: Contact) {
    return {};
  },
  async sendInvoice(_firm: Firm, invoice: Invoice) {
    return {
      invoiceId: invoice.externalInvoiceId ?? null,
      hostedInvoiceUrl: invoice.externalHostedInvoiceUrl ?? null,
      pdfUrl: invoice.externalInvoicePdfUrl ?? null,
      status: invoice.externalInvoiceStatus ?? null,
      syncedAt: invoice.externalSyncedAt ?? null,
    };
  },
  async syncInvoiceStatus(_firm: Firm, invoice: Invoice) {
    return {
      invoiceId: invoice.externalInvoiceId ?? null,
      hostedInvoiceUrl: invoice.externalHostedInvoiceUrl ?? null,
      pdfUrl: invoice.externalInvoicePdfUrl ?? null,
      status: invoice.externalInvoiceStatus ?? null,
      syncedAt: invoice.externalSyncedAt ?? null,
    };
  },
  handleWebhook() {
    return;
  },
};

export function createManualClientBillingProvider() {
  return manualProvider;
}
