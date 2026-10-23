import Stripe from "stripe";
import { ClientBillingConnectionStatus, InvoiceStatus, type Contact, type Firm, type Invoice } from "@/generated/prisma/client";
import { resolveAppBaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireStripeClient } from "@/lib/stripe";
import { calculateClientPaymentFeeRecoveryCents } from "./fee-recovery";
import {
  clientBillingConnectionData,
  clientBillingReadinessFromV1Account,
  clientBillingReadinessFromV2Account,
  isClientBillingReadinessActive,
  isLegacyExpressConnectedAccount,
  merchantAccountCreateParams,
  v1OnboardingLinkParams,
  v2ConnectedAccountEventTypes,
  v2OnboardingLinkParams,
  type ClientBillingReadiness,
  type V2ConnectedAccountSnapshot,
} from "./stripe-connect-account";
import type { ClientBillingProvider } from "./types";

const v2AccountInclude = ["configuration.merchant", "defaults", "requirements"] as const;

const v1AccountLinkFallbackCodes = new Set([
  "configs_must_match_to_use_account_links",
  "account_dashboard_not_supported",
  "not_found",
  "resource_missing",
]);

function getStripeAccountHeader(firm: Firm) {
  if (!firm.stripeConnectAccountId) {
    throw new Error("Stripe Connect account is not connected.");
  }

  return { stripeAccount: firm.stripeConnectAccountId } as const;
}

function connectionStatusFromFirm(firm: Firm) {
  if (firm.clientBillingConnectionStatus === ClientBillingConnectionStatus.DISABLED) {
    return ClientBillingConnectionStatus.DISABLED;
  }

  if (!firm.stripeConnectAccountId) {
    return ClientBillingConnectionStatus.NOT_STARTED;
  }

  if (!firm.clientBillingEnabled) {
    return ClientBillingConnectionStatus.ONBOARDING;
  }

  if (firm.stripeChargesEnabled && firm.stripePayoutsEnabled && firm.stripeDetailsSubmitted) {
    return ClientBillingConnectionStatus.ACTIVE;
  }

  if (!firm.stripeDetailsSubmitted || !firm.stripeChargesEnabled || !firm.stripePayoutsEnabled) {
    return ClientBillingConnectionStatus.RESTRICTED;
  }

  return ClientBillingConnectionStatus.ONBOARDING;
}

function isStripeError(error: unknown): error is InstanceType<typeof Stripe.errors.StripeError> {
  return error instanceof Stripe.errors.StripeError;
}

function canFallBackToV1AccountRead(error: unknown) {
  if (!isStripeError(error)) {
    return false;
  }

  return error.statusCode !== 401 && error.statusCode !== 403;
}

function shouldFallBackToV1AccountLink(error: unknown) {
  if (!isStripeError(error)) {
    return false;
  }

  return error.statusCode === 404 || (error.code ? v1AccountLinkFallbackCodes.has(error.code) : false);
}

async function retrieveV1Readiness(stripe: Stripe, accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    accountId: account.id,
    readiness: clientBillingReadinessFromV1Account(account),
  };
}

async function readConnectedAccountReadiness(stripe: Stripe, accountId: string) {
  let v2Error: unknown;

  try {
    const account = (await stripe.v2.core.accounts.retrieve(accountId, {
      include: [...v2AccountInclude],
    })) as V2ConnectedAccountSnapshot;

    if (isLegacyExpressConnectedAccount(account)) {
      return retrieveV1Readiness(stripe, accountId);
    }

    const readiness = clientBillingReadinessFromV2Account(account);
    if (readiness) {
      return { accountId: account.id || accountId, readiness };
    }
  } catch (error) {
    if (!canFallBackToV1AccountRead(error)) {
      throw error;
    }

    v2Error = error;
  }

  try {
    return await retrieveV1Readiness(stripe, accountId);
  } catch (error) {
    throw v2Error ?? error;
  }
}

async function persistFirmStripeReadiness(firm: Firm, accountId: string, readiness: ClientBillingReadiness) {
  const active = isClientBillingReadinessActive(readiness);

  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      stripeConnectAccountId: accountId,
      ...clientBillingConnectionData(readiness),
      clientBillingProvider: "STRIPE_CONNECT",
    },
  });

  return {
    provider: "stripe_connect" as const,
    connectionStatus: active ? ClientBillingConnectionStatus.ACTIVE : ClientBillingConnectionStatus.RESTRICTED,
    ready: active,
  };
}

async function createOnboardingLink(stripe: Stripe, accountId: string, useV1Link: boolean) {
  const baseUrl = resolveAppBaseUrl();

  if (useV1Link) {
    const accountLink = await stripe.accountLinks.create(v1OnboardingLinkParams(accountId, baseUrl));
    return accountLink.url;
  }

  try {
    const accountLink = await stripe.v2.core.accountLinks.create(v2OnboardingLinkParams(accountId, baseUrl));
    return accountLink.url;
  } catch (error) {
    if (!shouldFallBackToV1AccountLink(error)) {
      throw error;
    }

    const accountLink = await stripe.accountLinks.create(v1OnboardingLinkParams(accountId, baseUrl));
    return accountLink.url;
  }
}

async function existingAccountUsesV1Onboarding(stripe: Stripe, accountId: string) {
  try {
    const account = (await stripe.v2.core.accounts.retrieve(accountId, {
      include: ["defaults", "configuration.merchant"],
    })) as V2ConnectedAccountSnapshot;
    return isLegacyExpressConnectedAccount(account);
  } catch (error) {
    if (!canFallBackToV1AccountRead(error)) {
      throw error;
    }

    return true;
  }
}

export async function createOrResumeStripeConnectAccount(firm: Firm, stripe: Stripe = requireStripeClient()) {
  let accountId = firm.stripeConnectAccountId;
  let useV1Link = false;

  if (!accountId) {
    const account = await stripe.v2.core.accounts.create(merchantAccountCreateParams(firm));
    accountId = account.id;

    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        stripeConnectAccountId: account.id,
        clientBillingProvider: "STRIPE_CONNECT",
        clientBillingConnectionStatus: ClientBillingConnectionStatus.ONBOARDING,
        clientBillingEnabled: false,
      },
    });
  } else {
    useV1Link = await existingAccountUsesV1Onboarding(stripe, accountId);
    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        clientBillingProvider: "STRIPE_CONNECT",
        clientBillingConnectionStatus: ClientBillingConnectionStatus.ONBOARDING,
        clientBillingEnabled: false,
      },
    });
  }

  const url = await createOnboardingLink(stripe, accountId, useV1Link);
  return { url };
}

export async function refreshStripeConnectAccount(firm: Firm, stripe: Stripe = requireStripeClient()) {
  if (!firm.stripeConnectAccountId) {
    return {
      provider: "stripe_connect" as const,
      connectionStatus: ClientBillingConnectionStatus.NOT_STARTED,
      ready: false,
    };
  }

  const { accountId, readiness } = await readConnectedAccountReadiness(stripe, firm.stripeConnectAccountId);
  return persistFirmStripeReadiness(firm, accountId, readiness);
}

export async function processStripeConnectV2AccountNotification(
  notification: { type: string; related_object?: { id?: string | null } | null },
  stripe: Stripe = requireStripeClient(),
) {
  if (!v2ConnectedAccountEventTypes.has(notification.type)) {
    return;
  }

  const accountId = notification.related_object?.id;
  if (!accountId) {
    return;
  }

  const firm = await prisma.firm.findFirst({
    where: { stripeConnectAccountId: accountId },
  });

  if (!firm) {
    return;
  }

  await refreshStripeConnectAccount(firm, stripe);
}

function buildInvoiceLineDescription(invoice: Invoice) {
  return `Client billing fee for invoice ${invoice.invoiceNumber}`;
}

async function createOrUpdateStripeCustomer(firm: Firm, contact: Contact) {
  const stripe = requireStripeClient();
  if (!firm.stripeConnectAccountId) {
    throw new Error("Stripe Connect account is not connected.");
  }

  if (contact.stripeCustomerId || contact.externalBillingCustomerId) {
    const customerId = contact.stripeCustomerId ?? contact.externalBillingCustomerId;
    return {
      customerId,
      providerCustomerId: customerId,
      provider: "stripe_connect" as const,
    };
  }

  const customer = await stripe.customers.create(
    {
      name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email ?? undefined,
      phone: contact.phone ?? undefined,
      metadata: {
        firmId: firm.id,
        contactId: contact.id,
      },
    },
    getStripeAccountHeader(firm),
  );

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      stripeCustomerId: customer.id,
      externalBillingCustomerId: customer.id,
      externalBillingProvider: "stripe_connect",
    },
  });

  return { customerId: customer.id, providerCustomerId: customer.id, provider: "stripe_connect" as const };
}

const stripeConnectProvider: ClientBillingProvider = {
  getConnectionStatus(firm: Firm) {
    return {
      provider: "stripe_connect",
      connectionStatus: connectionStatusFromFirm(firm),
      ready: Boolean(firm.clientBillingEnabled && firm.stripeConnectAccountId && firm.stripeChargesEnabled && firm.stripePayoutsEnabled && firm.stripeDetailsSubmitted),
    };
  },
  async createOrResumeConnection(firm: Firm) {
    return createOrResumeStripeConnectAccount(firm);
  },
  async refreshConnectionStatus(firm: Firm) {
    return refreshStripeConnectAccount(firm);
  },
  isReady(firm: Firm) {
    return Boolean(firm.clientBillingEnabled && firm.stripeConnectAccountId && firm.stripeChargesEnabled && firm.stripePayoutsEnabled && firm.stripeDetailsSubmitted);
  },
  async createOrUpdateCustomer(firm: Firm, contact: Contact) {
    return createOrUpdateStripeCustomer(firm, contact);
  },
  async sendInvoice(firm: Firm, invoice: Invoice) {
    const stripe = requireStripeClient();
    const account = getStripeAccountHeader(firm);
    const claim = await prisma.claim.findUnique({ where: { id: invoice.claimId }, include: { contact: true } });

    if (!claim) {
      throw new Error("Claim not found for invoice.");
    }

    const customerResult = await createOrUpdateStripeCustomer(firm, claim.contact);
    const customerId = customerResult.customerId;

    if (!customerId) {
      throw new Error("Stripe customer could not be created.");
    }

    // Direct charge on the connected account. No application fee: the office is the merchant,
    // and Stripe collects card processing fees from that account.
    const createdInvoice = await stripe.invoices.create(
      {
        customer: customerId,
        collection_method: "send_invoice",
        auto_advance: false,
        days_until_due: invoice.dueAt ? Math.max(Math.ceil((new Date(invoice.dueAt).getTime() - Date.now()) / 86400000), 1) : 14,
        metadata: {
          firmId: firm.id,
          invoiceId: invoice.id,
          claimId: invoice.claimId,
        },
      },
      account,
    );

    const invoiceItems: Array<Promise<Stripe.Response<Stripe.InvoiceItem>>> = [];

    invoiceItems.push(
      stripe.invoiceItems.create(
        {
          customer: customerId,
          invoice: createdInvoice.id,
          amount: invoice.feeAmountCents,
          currency: "usd",
          description: buildInvoiceLineDescription(invoice),
        },
        account,
      ),
    );

    const feeRecoveryCents = calculateClientPaymentFeeRecoveryCents(firm, invoice.feeAmountCents);

    if (feeRecoveryCents > 0) {
      invoiceItems.push(
        stripe.invoiceItems.create(
          {
            customer: customerId,
            invoice: createdInvoice.id,
            amount: feeRecoveryCents,
            currency: "usd",
            description: firm.clientPaymentFeeLabel ?? "Payment processing fee recovery",
          },
          account,
        ),
      );
    }

    await Promise.all(invoiceItems);

    const finalized = await stripe.invoices.finalizeInvoice(createdInvoice.id, {}, account);
    const sent = await stripe.invoices.sendInvoice(finalized.id, {}, account);
    const sentInvoice = sent as Stripe.Response<Stripe.Invoice> & { payment_intent?: string | Stripe.PaymentIntent | null };

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        clientBillingProvider: "STRIPE_CONNECT",
        externalInvoiceId: sent.id,
        externalInvoiceStatus: sent.status ?? undefined,
        externalHostedInvoiceUrl: sent.hosted_invoice_url ?? undefined,
        externalInvoicePdfUrl: sent.invoice_pdf ?? undefined,
        externalPaymentIntentId: typeof sentInvoice.payment_intent === "string" ? sentInvoice.payment_intent : sentInvoice.payment_intent?.id ?? undefined,
        externalAmountDueCents: sent.amount_due ?? undefined,
        externalAmountPaidCents: sent.amount_paid ?? undefined,
        externalSyncedAt: new Date(),
        sentToClientAt: new Date(),
        status: InvoiceStatus.SENT,
      },
    });

    await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({ where: { id: invoice.claimId }, include: { contact: true } });
      if (claim) {
        await tx.activity.create({
          data: {
            firmId: firm.id,
            claimId: claim.id,
            contactId: claim.contactId,
            type: "EMAIL",
            subject: "Invoice sent to client",
            body: `Sent invoice ${invoice.invoiceNumber} using Stripe Connect.`,
          },
        });
      }
    });

    return {
      invoiceId: sent.id,
      hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
      pdfUrl: sent.invoice_pdf ?? null,
      status: sent.status ?? null,
      syncedAt: new Date(),
    };
  },
  async syncInvoiceStatus(firm: Firm, invoice: Invoice) {
    if (!invoice.externalInvoiceId) {
      return {
        invoiceId: null,
        hostedInvoiceUrl: invoice.externalHostedInvoiceUrl ?? null,
        pdfUrl: invoice.externalInvoicePdfUrl ?? null,
        status: invoice.externalInvoiceStatus ?? null,
        syncedAt: invoice.externalSyncedAt ?? null,
      };
    }

    const stripe = requireStripeClient();
    const refreshed = await stripe.invoices.retrieve(invoice.externalInvoiceId, {}, getStripeAccountHeader(firm));
    const refreshedInvoice = refreshed as Stripe.Response<Stripe.Invoice> & { payment_intent?: string | Stripe.PaymentIntent | null };
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        externalInvoiceStatus: refreshed.status ?? undefined,
        externalHostedInvoiceUrl: refreshed.hosted_invoice_url ?? undefined,
        externalInvoicePdfUrl: refreshed.invoice_pdf ?? undefined,
        externalPaymentIntentId: typeof refreshedInvoice.payment_intent === "string" ? refreshedInvoice.payment_intent : refreshedInvoice.payment_intent?.id ?? undefined,
        externalAmountDueCents: refreshed.amount_due ?? undefined,
        externalAmountPaidCents: refreshed.amount_paid ?? undefined,
        externalSyncedAt: new Date(),
      },
    });

    return {
      invoiceId: refreshed.id,
      hostedInvoiceUrl: refreshed.hosted_invoice_url ?? null,
      pdfUrl: refreshed.invoice_pdf ?? null,
      status: refreshed.status ?? null,
      syncedAt: new Date(),
    };
  },
  handleWebhook() {
    return;
  },
};

export function createStripeConnectClientBillingProvider() {
  return stripeConnectProvider;
}
