import type { Contact, Firm, Invoice, ClientBillingConnectionStatus } from "@/generated/prisma/client";

export type ClientBillingProviderName = "manual" | "stripe_connect";
export type ClientPaymentSourceName = "manual" | "stripe" | "future_external";

export type ClientBillingProviderResult = {
  provider: ClientBillingProviderName;
  connectionStatus: ClientBillingConnectionStatus;
  ready: boolean;
};

export type ClientBillingCustomerResult = {
  customerId?: string | null;
  providerCustomerId?: string | null;
  provider?: ClientBillingProviderName;
};

export type ClientBillingInvoiceResult = {
  invoiceId?: string | null;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  status?: string | null;
  syncedAt?: Date | null;
};

export type ClientBillingWebhookResult = Promise<void> | void;

export type ClientBillingProvider = {
  getConnectionStatus(firm: Firm): ClientBillingProviderResult;
  createOrResumeConnection(firm: Firm): Promise<{ url?: string | null } | null>;
  refreshConnectionStatus(firm: Firm): Promise<ClientBillingProviderResult>;
  isReady(firm: Firm): boolean;
  createOrUpdateCustomer(firm: Firm, contact: Contact): Promise<ClientBillingCustomerResult>;
  sendInvoice(firm: Firm, invoice: Invoice): Promise<ClientBillingInvoiceResult>;
  syncInvoiceStatus(firm: Firm, invoice: Invoice): Promise<ClientBillingInvoiceResult>;
  handleWebhook(event: unknown): ClientBillingWebhookResult;
};
