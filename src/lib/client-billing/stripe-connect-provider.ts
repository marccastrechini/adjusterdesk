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
  hostedInvoicePresentation,
  insuredDisplayName,
  isClientBillingReadinessActive,
  isLegacyExpressConnectedAccount,
  isStatementDescriptorPermissionError,
  logClientBillingStripeError,
  merchantAccountCreateParams,
  resolveInvoicePaymentRefs,
  stableDaysUntilDue,
  v1BusinessProfileNameParams,
  v1OnboardingLinkParams,
  v1PublicBusinessNameUpdateParams,
  v2BusinessNameOnlyUpdateParams,
  v2ConnectedAccountEventTypes,
  v2OnboardingLinkParams,
  v2PublicBusinessNameUpdateParams,
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
  const result = await persistFirmStripeReadiness(firm, accountId, readiness);
  try {
    await syncConnectedAccountPublicName(stripe, firm);
  } catch (error) {
    logClientBillingStripeError("Could not update the connected account public name.", error);
  }
  return result;
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

const publicNameInclude = ["defaults", "configuration.merchant"] as const;

async function updateV1PublicBusinessName(stripe: Stripe, accountId: string, name: string) {
  try {
    await stripe.accounts.update(accountId, v1PublicBusinessNameUpdateParams(name));
  } catch (error) {
    try {
      await stripe.accounts.update(accountId, v1BusinessProfileNameParams(name));
    } catch (retryError) {
      logClientBillingStripeError("Could not update the connected account public name.", retryError);
      return;
    }

    logClientBillingStripeError("Could not update the connected account statement descriptor.", error);
  }
}

/**
 * Hosted invoices snapshot the connected account's customer-facing name at
 * creation. Update it before the next invoice when Stripe allows the change.
 * Statement descriptors are best-effort: a permission error or rejection is
 * never fatal, and full-dashboard accounts that Stripe bills directly skip
 * the write entirely.
 */
export async function syncConnectedAccountPublicName(stripe: Stripe, firm: Firm) {
  const accountId = firm.stripeConnectAccountId;
  const name = firm.name?.trim();
  if (!accountId || !name) {
    return;
  }

  try {
    const account = (await stripe.v2.core.accounts.retrieve(accountId, {
      include: [...publicNameInclude],
    })) as V2ConnectedAccountSnapshot;

    if (isLegacyExpressConnectedAccount(account)) {
      await updateV1PublicBusinessName(stripe, accountId, name);
      return;
    }

    const params = v2PublicBusinessNameUpdateParams(account, name);
    if (!params) {
      return;
    }

    try {
      await stripe.v2.core.accounts.update(accountId, params);
    } catch (error) {
      const descriptorWrite = Boolean(params.configuration?.merchant?.statement_descriptor);
      const namesOnly = descriptorWrite ? v2BusinessNameOnlyUpdateParams(account, name) : null;
      const permissionDenied = descriptorWrite && isStatementDescriptorPermissionError(error);

      if (!namesOnly) {
        if (!permissionDenied) {
          logClientBillingStripeError(
            descriptorWrite ? "Could not update the connected account statement descriptor." : "Could not update the connected account public name.",
            error,
          );
        }
        return;
      }

      if (!permissionDenied) {
        logClientBillingStripeError("Could not update the connected account statement descriptor.", error);
      }

      try {
        await stripe.v2.core.accounts.update(accountId, namesOnly);
      } catch (retryError) {
        logClientBillingStripeError("Could not update the connected account public name.", retryError);
      }
    }
  } catch (error) {
    if (!canFallBackToV1AccountRead(error)) {
      logClientBillingStripeError("Could not update the connected account public name.", error);
      return;
    }

    try {
      await updateV1PublicBusinessName(stripe, accountId, name);
    } catch (retryError) {
      logClientBillingStripeError("Could not update the connected account public name.", retryError);
    }
  }
}

function stripeAccountOptions(firm: Firm, idempotencyKey?: string): Stripe.RequestOptions {
  if (!firm.stripeConnectAccountId) {
    throw new Error("Stripe Connect account is not connected.");
  }

  return {
    stripeAccount: firm.stripeConnectAccountId,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
}

async function createOrUpdateStripeCustomer(firm: Firm, contact: Contact, stripe: Stripe) {
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

async function ensureInvoiceLines(stripe: Stripe, firm: Firm, invoice: Invoice, stripeInvoice: Stripe.Invoice, customerId: string) {
  const lines = stripeInvoice.lines?.data ?? [];
  const feeDescription = buildInvoiceLineDescription(invoice);
  const hasFee = lines.some((line) => line.description === feeDescription && line.amount === invoice.feeAmountCents);

  if (!hasFee) {
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        invoice: stripeInvoice.id,
        amount: invoice.feeAmountCents,
        currency: "usd",
        description: feeDescription,
      },
      stripeAccountOptions(firm, `client-billing-item-fee-${invoice.id}`),
    );
  }

  const feeRecoveryCents = calculateClientPaymentFeeRecoveryCents(firm, invoice.feeAmountCents);
  if (feeRecoveryCents <= 0) {
    return;
  }

  const recoveryDescription = firm.clientPaymentFeeLabel ?? "Payment processing fee recovery";
  const hasRecovery = lines.some((line) => line.description === recoveryDescription && line.amount === feeRecoveryCents);
  if (hasRecovery) {
    return;
  }

  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: stripeInvoice.id,
      amount: feeRecoveryCents,
      currency: "usd",
      description: recoveryDescription,
    },
    stripeAccountOptions(firm, `client-billing-item-recovery-${invoice.id}`),
  );
}

async function recordInvoiceSentActivity(firm: Firm, invoice: Invoice) {
  await prisma.$transaction(async (tx) => {
    const claim = await tx.claim.findUnique({ where: { id: invoice.claimId }, include: { contact: true } });
    if (!claim) {
      return;
    }

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
  });
}

export async function sendStripeConnectInvoice(firm: Firm, invoice: Invoice, stripe: Stripe = requireStripeClient()) {
  await syncConnectedAccountPublicName(stripe, firm);
  const claim = await prisma.claim.findUnique({ where: { id: invoice.claimId }, include: { contact: true } });

  if (!claim) {
    throw new Error("Claim not found for invoice.");
  }

  const customerResult = await createOrUpdateStripeCustomer(firm, claim.contact, stripe);
  const customerId = customerResult.customerId;

  if (!customerId) {
    throw new Error("Stripe customer could not be created.");
  }

  const presentation = hostedInvoicePresentation({
    invoiceNumber: invoice.invoiceNumber,
    claimNumber: claim.claimNumber,
    insuredName: insuredDisplayName(claim.contact),
  });
  const daysUntilDue = stableDaysUntilDue(invoice);
  const metadata = {
    firmId: firm.id,
    invoiceId: invoice.id,
    claimId: invoice.claimId,
    invoiceNumber: invoice.invoiceNumber,
  };
  const account = stripeAccountOptions(firm);

  let stripeInvoice: Stripe.Invoice;

  if (invoice.externalInvoiceId) {
    stripeInvoice = await stripe.invoices.retrieve(invoice.externalInvoiceId, {}, account);
  } else {
    // Direct charge on the connected account. No application fee: the office is the merchant,
    // and Stripe collects card processing fees from that account. account_name is copied from
    // the connected account's customer-facing business name and is not settable on the invoice.
    stripeInvoice = await stripe.invoices.create(
      {
        customer: customerId,
        collection_method: "send_invoice",
        auto_advance: false,
        days_until_due: daysUntilDue,
        description: presentation.description,
        custom_fields: presentation.custom_fields,
        metadata,
        pending_invoice_items_behavior: "exclude",
        ...(presentation.number ? { number: presentation.number } : {}),
      },
      stripeAccountOptions(firm, `client-billing-create-${invoice.id}`),
    );

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        clientBillingProvider: "STRIPE_CONNECT",
        externalInvoiceId: stripeInvoice.id,
        externalInvoiceStatus: stripeInvoice.status ?? "draft",
      },
    });
  }

  if (stripeInvoice.status === "void" || stripeInvoice.status === "uncollectible") {
    throw new Error(`Stripe invoice ${stripeInvoice.id} is ${stripeInvoice.status} and cannot be resent.`);
  }

  if (!stripeInvoice.status || stripeInvoice.status === "draft") {
    const draftInvoice = stripeInvoice;
    // Stripe rejects `number` when this draft already has it, including the
    // invoice just created above. Only send a number that is not already set.
    const draftNumber = draftInvoice.number ?? undefined;
    stripeInvoice = await stripe.invoices.update(
      draftInvoice.id,
      {
        description: presentation.description,
        custom_fields: presentation.custom_fields,
        metadata,
        days_until_due: daysUntilDue,
        ...(presentation.number && presentation.number !== draftNumber ? { number: presentation.number } : {}),
      },
      account,
    );
    await ensureInvoiceLines(stripe, firm, invoice, draftInvoice, customerId);
    stripeInvoice = await stripe.invoices.finalizeInvoice(draftInvoice.id, {}, stripeAccountOptions(firm, `client-billing-finalize-${invoice.id}`));
  }

  const alreadyEmailed = Boolean(invoice.sentToClientAt);
  if (stripeInvoice.status === "open" && !alreadyEmailed) {
    stripeInvoice = await stripe.invoices.sendInvoice(stripeInvoice.id, {}, stripeAccountOptions(firm, `client-billing-send-${invoice.id}`));
  }

  const paymentRefs = await resolveInvoicePaymentRefs(stripe, stripeInvoice, {
    stripeAccount: firm.stripeConnectAccountId,
    listIfMissing: stripeInvoice.status === "paid",
  });
  const syncedAt = new Date();

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      clientBillingProvider: "STRIPE_CONNECT",
      externalInvoiceId: stripeInvoice.id,
      externalInvoiceStatus: stripeInvoice.status ?? undefined,
      externalHostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? undefined,
      externalInvoicePdfUrl: stripeInvoice.invoice_pdf ?? undefined,
      externalPaymentIntentId: paymentRefs.paymentIntentId,
      externalAmountDueCents: stripeInvoice.amount_due ?? undefined,
      externalAmountPaidCents: stripeInvoice.amount_paid ?? undefined,
      externalSyncedAt: syncedAt,
      sentToClientAt: invoice.sentToClientAt ?? syncedAt,
      status: invoice.status === InvoiceStatus.PAID || stripeInvoice.status === "paid" ? InvoiceStatus.PAID : InvoiceStatus.SENT,
    },
  });

  if (!alreadyEmailed) {
    await recordInvoiceSentActivity(firm, invoice);
  }

  return {
    invoiceId: stripeInvoice.id,
    hostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? null,
    pdfUrl: stripeInvoice.invoice_pdf ?? null,
    status: stripeInvoice.status ?? null,
    syncedAt,
  };
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
    return createOrUpdateStripeCustomer(firm, contact, requireStripeClient());
  },
  async sendInvoice(firm: Firm, invoice: Invoice) {
    return sendStripeConnectInvoice(firm, invoice);
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
    const refreshed = await stripe.invoices.retrieve(invoice.externalInvoiceId, { expand: ["payments"] }, getStripeAccountHeader(firm));
    const paymentRefs = await resolveInvoicePaymentRefs(stripe, refreshed, {
      stripeAccount: firm.stripeConnectAccountId,
      listIfMissing: refreshed.status === "paid",
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        externalInvoiceStatus: refreshed.status ?? undefined,
        externalHostedInvoiceUrl: refreshed.hosted_invoice_url ?? undefined,
        externalInvoicePdfUrl: refreshed.invoice_pdf ?? undefined,
        externalPaymentIntentId: paymentRefs.paymentIntentId,
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
