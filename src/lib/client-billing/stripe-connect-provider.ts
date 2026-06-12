import Stripe from "stripe";
import { ClientBillingConnectionStatus, InvoiceStatus, type Contact, type Firm, type Invoice } from "@/generated/prisma/client";
import { resolveAppBaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireStripeClient } from "@/lib/stripe";
import { calculateClientPaymentFeeRecoveryCents } from "./fee-recovery";
import type { ClientBillingProvider } from "./types";

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

async function refreshFirmStripeConnection(firm: Firm, account: Stripe.Account) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const active = chargesEnabled && payoutsEnabled && detailsSubmitted;

  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      stripeConnectAccountId: account.id,
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      stripeDetailsSubmitted: detailsSubmitted,
      clientBillingConnectionStatus: active ? ClientBillingConnectionStatus.ACTIVE : ClientBillingConnectionStatus.RESTRICTED,
      clientBillingEnabled: active,
      clientBillingProvider: "STRIPE_CONNECT",
    },
  });

  return {
    provider: "stripe_connect" as const,
    connectionStatus: active ? ClientBillingConnectionStatus.ACTIVE : ClientBillingConnectionStatus.RESTRICTED,
    ready: active,
  };
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
    const stripe = requireStripeClient();
    let accountId = firm.stripeConnectAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: firm.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { firmId: firm.id },
      });

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
      await prisma.firm.update({
        where: { id: firm.id },
        data: {
          clientBillingProvider: "STRIPE_CONNECT",
          clientBillingConnectionStatus: ClientBillingConnectionStatus.ONBOARDING,
          clientBillingEnabled: false,
        },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${resolveAppBaseUrl()}/settings/client-payments`,
      return_url: `${resolveAppBaseUrl()}/settings/client-payments`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  },
  async refreshConnectionStatus(firm: Firm) {
    const stripe = requireStripeClient();
    if (!firm.stripeConnectAccountId) {
      return {
        provider: "stripe_connect",
        connectionStatus: ClientBillingConnectionStatus.NOT_STARTED,
        ready: false,
      };
    }

    const account = await stripe.accounts.retrieve(firm.stripeConnectAccountId);
    return refreshFirmStripeConnection(firm, account);
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
  handleWebhook(event) {
    return;
  },
};

export function createStripeConnectClientBillingProvider() {
  return stripeConnectProvider;
}
