import type Stripe from "stripe";
import { ActivityType, ClientPaymentSource, InvoiceStatus, SubscriptionStatus } from "@/generated/prisma/client";
import { defaultLimitForPlan, findPublicPlanBySlug, mapStripeSubscriptionStatus, parsePlanSlug, resolveStripePriceId } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { achPaymentsStatusFromV1Account, clientBillingConnectionData, clientBillingReadinessFromV1Account, logClientBillingStripeError, paymentRefsFromInvoice, resolveInvoicePaymentRefs, stripeInvoiceIdFromInvoicePayments, type InvoicePaymentRefs } from "@/lib/client-billing/stripe-connect-account";
import { completeStripeSignupFromSessionId } from "@/lib/signup";
import { requireStripeClient } from "@/lib/stripe";

function asDateFromUnix(value: number | null | undefined) {
  if (!value || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
}

const ignorableSignupCompletionErrors = [
  "Signup request is already being processed.",
  "Checkout is not complete yet.",
  "Checkout payment is not complete yet.",
  "Subscription was not created.",
];

export function isIgnorableSignupCompletionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return ignorableSignupCompletionErrors.includes(error.message);
}

async function updateFirmBySubscriptionOrCustomer(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
  data: {
    subscriptionStatus?: SubscriptionStatus;
    billingStartedAt?: Date;
    billingSubscriptionId?: string;
    billingCustomerId?: string;
    billingPriceId?: string | null;
    billingCurrentPeriodEnd?: Date | null;
    trialEndsAt?: Date | null;
  };
}) {
  if (!params.subscriptionId && !params.customerId) {
    return;
  }

  await prisma.firm.updateMany({
    where: {
      OR: [
        ...(params.subscriptionId ? [{ billingSubscriptionId: params.subscriptionId }] : []),
        ...(params.customerId ? [{ billingCustomerId: params.customerId }] : []),
      ],
    },
    data: params.data,
  });
}

function checkoutPaymentSettled(paymentStatus: string | null | undefined) {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

async function findClientInvoiceByStripeRefs(params: {
  invoiceId?: string | null;
  paymentIntentId?: string | null;
}) {
  if (!params.invoiceId && !params.paymentIntentId) {
    return null;
  }

  return prisma.invoice.findFirst({
    where: {
      OR: [
        ...(params.invoiceId ? [{ externalInvoiceId: params.invoiceId }] : []),
        ...(params.paymentIntentId ? [{ externalPaymentIntentId: params.paymentIntentId }] : []),
      ],
    },
    include: { claim: { include: { contact: true } } },
  });
}

async function recordClientBillingActivity(invoice: Awaited<ReturnType<typeof findClientInvoiceByStripeRefs>>, subject: string, body: string) {
  if (!invoice) {
    return;
  }

  const claim = await prisma.claim.findUnique({
    where: { id: invoice.claimId },
    select: { contactId: true },
  });

  if (!claim) {
    return;
  }

  await prisma.activity.create({
    data: {
      firmId: invoice.firmId,
      claimId: invoice.claimId,
      contactId: claim.contactId,
      type: ActivityType.EMAIL,
      subject,
      body,
    },
  });
}

async function syncInvoicePaid(
  invoice: Awaited<ReturnType<typeof findClientInvoiceByStripeRefs>>,
  stripeInvoice: Stripe.Invoice,
  refs: InvoicePaymentRefs,
) {
  if (!invoice) {
    return;
  }

  const paymentIntentId = refs.paymentIntentId ?? null;
  const chargeId = refs.chargeId ?? null;
  const amountPaidCents = stripeInvoice.amount_paid ?? stripeInvoice.amount_due ?? invoice.feeAmountCents;

  const claim = await prisma.claim.findUnique({
    where: { id: invoice.claimId },
    include: { contact: true },
  });

  if (!claim) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        amountPaidCents,
        externalInvoiceStatus: stripeInvoice.status ?? undefined,
        externalHostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? undefined,
        externalInvoicePdfUrl: stripeInvoice.invoice_pdf ?? undefined,
        externalPaymentIntentId: paymentIntentId ?? undefined,
        externalAmountDueCents: stripeInvoice.amount_due ?? undefined,
        externalAmountPaidCents: stripeInvoice.amount_paid ?? undefined,
        externalPaymentStatus: "succeeded",
        externalSyncedAt: new Date(),
      },
    });

    const existingPayment = paymentIntentId
      ? await tx.payment.findFirst({
          where: {
            firmId: invoice.firmId,
            claimId: invoice.claimId,
            invoiceId: invoice.id,
            externalPaymentId: paymentIntentId,
          },
        })
      : null;

    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          source: ClientPaymentSource.STRIPE,
          amountCents: amountPaidCents,
          paidAt: new Date(),
          externalPaymentId: paymentIntentId ?? undefined,
          externalChargeId: chargeId ?? undefined,
          externalProvider: "stripe_connect",
        },
      });
    } else {
      await tx.payment.create({
        data: {
          firmId: invoice.firmId,
          claimId: invoice.claimId,
          invoiceId: invoice.id,
          source: ClientPaymentSource.STRIPE,
          amountCents: amountPaidCents,
          paidAt: new Date(),
          payee: claim.contact.company ?? `${claim.contact.firstName} ${claim.contact.lastName}`,
          notes: `Recorded from Stripe invoice ${stripeInvoice.id}.`,
          externalPaymentId: paymentIntentId ?? undefined,
          externalChargeId: chargeId ?? undefined,
          externalBalanceTransactionId: undefined,
          externalProvider: "stripe_connect",
        },
      });
    }

    await tx.activity.create({
      data: {
        firmId: invoice.firmId,
        claimId: invoice.claimId,
        contactId: claim.contactId,
        type: ActivityType.EMAIL,
        subject: "Invoice paid",
        body: `Invoice ${invoice.invoiceNumber} was marked paid by Stripe.`,
      },
    });
  });
}

type ClientInvoice = Awaited<ReturnType<typeof findClientInvoiceByStripeRefs>>;

function paymentIntentIdFromUnknown(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  return null;
}

async function findClientInvoiceByLocalId(localInvoiceId: string | null | undefined) {
  if (!localInvoiceId) {
    return null;
  }

  return prisma.invoice.findFirst({
    where: { id: localInvoiceId },
    include: { claim: { include: { contact: true } } },
  });
}

async function findClientInvoiceForPaymentIntent(paymentIntent: {
  id: string;
  invoice?: string | { id?: string | null } | null;
  metadata?: Stripe.Metadata | null;
}) {
  const found = await findClientInvoiceByStripeRefs({
    paymentIntentId: paymentIntent.id,
    invoiceId: paymentIntentIdFromUnknown(paymentIntent.invoice),
  });

  if (found) {
    return found;
  }

  return findClientInvoiceByLocalId(paymentIntent.metadata?.invoiceId);
}

/**
 * Hosted-invoice PaymentIntents on current API versions have `invoice: null`
 * and do not copy our invoice metadata. The link is an InvoicePayment on the
 * connected account, listed by `payment.payment_intent`.
 */
async function findClientInvoiceForProcessingPaymentIntent(
  paymentIntent: {
    id: string;
    invoice?: string | { id?: string | null } | null;
    metadata?: Stripe.Metadata | null;
  },
  options: { stripe?: Stripe; stripeAccount?: string | null },
) {
  const direct = await findClientInvoiceForPaymentIntent(paymentIntent);
  if (direct) {
    return direct;
  }

  let stripeInvoiceId: string | undefined;
  try {
    const stripe = options.stripe ?? requireStripeClient();
    const listed = await stripe.invoicePayments.list(
      {
        limit: 10,
        payment: {
          type: "payment_intent",
          payment_intent: paymentIntent.id,
        },
      },
      options.stripeAccount ? { stripeAccount: options.stripeAccount } : undefined,
    );
    stripeInvoiceId = stripeInvoiceIdFromInvoicePayments(listed);
  } catch (error) {
    logClientBillingStripeError("Could not list invoice payments for a processing PaymentIntent.", error);
    throw error;
  }

  if (!stripeInvoiceId) {
    return null;
  }

  return findClientInvoiceByStripeRefs({ invoiceId: stripeInvoiceId });
}

/**
 * ACH debits stay in processing for several business days. Keep the invoice
 * unpaid and do not write a collected payment until invoice.paid.
 */
async function markClientInvoicePaymentPending(invoice: ClientInvoice, paymentIntentId: string) {
  if (!invoice || invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.WRITTEN_OFF) {
    return;
  }

  if (invoice.externalPaymentStatus === "processing" && invoice.externalPaymentIntentId === paymentIntentId) {
    return;
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      externalPaymentStatus: "processing",
      externalPaymentIntentId: paymentIntentId,
      externalSyncedAt: new Date(),
    },
  });

  await recordClientBillingActivity(
    invoice,
    "Payment pending",
    `A bank payment for invoice ${invoice.invoiceNumber} is processing. The fee stays unpaid until Stripe marks the invoice paid.`,
  );
}

async function resetClientInvoicePayment(
  invoice: ClientInvoice,
  input: { paymentIntentId?: string | null; subject: string; body: string; notifyWhenUnchanged?: boolean },
) {
  if (!invoice || invoice.status === InvoiceStatus.WRITTEN_OFF) {
    if (invoice && input.notifyWhenUnchanged) {
      await recordClientBillingActivity(invoice, input.subject, input.body);
    }
    return;
  }

  const wasProcessing = invoice.externalPaymentStatus === "processing";
  const wasCollected = invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_PAID;

  await prisma.$transaction(async (tx) => {
    const stripePayments = await tx.payment.findMany({
      where: {
        invoiceId: invoice.id,
        source: ClientPaymentSource.STRIPE,
        ...(input.paymentIntentId ? { externalPaymentId: input.paymentIntentId } : {}),
      },
    });

    if (stripePayments.length > 0) {
      await tx.payment.deleteMany({
        where: { id: { in: stripePayments.map((payment) => payment.id) } },
      });
    }

    const remaining = await tx.payment.findMany({
      where: { invoiceId: invoice.id },
    });
    const amountPaidCents = remaining.reduce((sum, payment) => sum + payment.amountCents, 0);
    const nextStatus =
      amountPaidCents <= 0
        ? invoice.status === InvoiceStatus.DRAFT
          ? InvoiceStatus.DRAFT
          : InvoiceStatus.SENT
        : amountPaidCents >= invoice.feeAmountCents
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;
    const changed =
      wasProcessing ||
      wasCollected ||
      stripePayments.length > 0 ||
      invoice.externalPaymentStatus !== "failed" ||
      nextStatus !== invoice.status ||
      amountPaidCents !== invoice.amountPaidCents;

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: nextStatus,
        amountPaidCents,
        paidAt: nextStatus === InvoiceStatus.PAID ? invoice.paidAt : null,
        externalPaymentStatus: "failed",
        externalPaymentIntentId: input.paymentIntentId ?? invoice.externalPaymentIntentId ?? undefined,
        externalSyncedAt: new Date(),
      },
    });

    if (changed || input.notifyWhenUnchanged) {
      const claim = await tx.claim.findUnique({
        where: { id: invoice.claimId },
        select: { contactId: true },
      });

      if (claim) {
        await tx.activity.create({
          data: {
            firmId: invoice.firmId,
            claimId: invoice.claimId,
            contactId: claim.contactId,
            type: ActivityType.EMAIL,
            subject: input.subject,
            body: input.body,
          },
        });
      }
    }
  });
}

async function syncInvoiceSent(invoice: Awaited<ReturnType<typeof findClientInvoiceByStripeRefs>>, stripeInvoice: Stripe.Invoice) {
  if (!invoice) {
    return;
  }

  const refs = paymentRefsFromInvoice(stripeInvoice);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.SENT,
      sentToClientAt: invoice.sentToClientAt ?? new Date(),
      externalInvoiceStatus: stripeInvoice.status ?? undefined,
      externalHostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? undefined,
      externalInvoicePdfUrl: stripeInvoice.invoice_pdf ?? undefined,
      externalPaymentIntentId: refs.paymentIntentId,
      externalAmountDueCents: stripeInvoice.amount_due ?? undefined,
      externalAmountPaidCents: stripeInvoice.amount_paid ?? undefined,
      externalSyncedAt: new Date(),
    },
  });

}

export async function processStripeWebhookEvent(event: Stripe.Event, stripe?: Stripe) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const intentId = session.metadata?.signupIntentId ?? session.client_reference_id ?? undefined;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      // Conversion path: trial firm is subscribing via Settings/Billing.
      const firmId = session.metadata?.firmId;
      if (firmId) {
        const firm = await prisma.firm.findUnique({
          where: { id: firmId },
          select: { id: true },
        });

        if (!firm) {
          return;
        }

        const conversionPlan = parsePlanSlug(session.metadata?.planSlug);
        const conversionPlanDefinition = conversionPlan ? findPublicPlanBySlug(conversionPlan) : null;
        const selectedPriceId = conversionPlan ? resolveStripePriceId(conversionPlan) : null;

        await prisma.firm.updateMany({
          where: { id: firmId },
          data: {
            ...(checkoutPaymentSettled(session.payment_status) ? { billingStartedAt: new Date() } : {}),
            ...(customerId ? { billingCustomerId: customerId } : {}),
            ...(subscriptionId ? { billingSubscriptionId: subscriptionId } : {}),
            ...(selectedPriceId ? { billingPriceId: selectedPriceId } : {}),
            ...(conversionPlanDefinition
              ? {
                  subscriptionPlan: conversionPlanDefinition.plan,
                  includedUserLimit: defaultLimitForPlan(conversionPlanDefinition.plan),
                }
              : {}),
          },
        });

        return;
      }

      // Legacy signup path: SignupIntent-based workspace provisioning.
      if (!intentId) {
        return;
      }

      await prisma.signupIntent.updateMany({
        where: { id: intentId },
        data: {
          status: "CHECKOUT_COMPLETED",
          stripeCheckoutSessionId: session.id,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId ?? undefined,
          stripePriceId: session.metadata?.priceId ?? undefined,
        },
      });

      // Complete workspace provisioning from webhook as a fallback when users do not return to /signup/success.
      try {
        await completeStripeSignupFromSessionId(session.id);
      } catch (error) {
        // Ignore expected race/incomplete states; /signup/success can retry completion idempotently.
        if (!isIgnorableSignupCompletionError(error)) {
          console.warn("[billing] Unexpected checkout completion issue from webhook.", {
            eventType: event.type,
            checkoutSessionId: session.id,
          });
        }
      }

      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const subscriptionId = subscription.id;
      const firstItem = subscription.items.data[0];
      const priceId = firstItem?.price?.id ?? null;

      await updateFirmBySubscriptionOrCustomer({
        subscriptionId,
        customerId,
        data: {
          ...((subscription.status === "active" || subscription.status === "trialing") ? { billingStartedAt: new Date() } : {}),
          billingSubscriptionId: subscriptionId,
          billingCustomerId: customerId ?? undefined,
          billingPriceId: priceId,
          billingCurrentPeriodEnd: asDateFromUnix(firstItem?.current_period_end),
          trialEndsAt: asDateFromUnix(subscription.trial_end),
          subscriptionStatus: mapStripeSubscriptionStatus(subscription.status),
        },
      });

      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        (invoice as { parent?: { subscription_details?: { subscription?: string } } }).parent?.subscription_details?.subscription ??
        null;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      // Connected-account invoice failures are client fees. They must not mark the firm's SaaS subscription past due.
      if (!event.account) {
        await updateFirmBySubscriptionOrCustomer({
          subscriptionId,
          customerId,
          data: {
            subscriptionStatus: SubscriptionStatus.PAST_DUE,
          },
        });
      }

      const paymentRefs = paymentRefsFromInvoice(invoice);
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: paymentRefs.paymentIntentId ?? null,
      });

      await resetClientInvoicePayment(clientInvoice, {
        paymentIntentId: paymentRefs.paymentIntentId ?? null,
        subject: "Invoice payment failed",
        body: `Stripe reported a payment failure for invoice ${clientInvoice?.invoiceNumber ?? invoice.id}. The fee is unpaid until a later payment succeeds.`,
      });

      return;
    }

    case "account.updated": {
      // v2 merchant accounts still emit this v1 snapshot on the connected-accounts endpoint.
      // Thin v2.core.account events are handled by /api/stripe/connect-v2-webhook.
      const account = event.data.object as Stripe.Account;
      const readiness = clientBillingReadinessFromV1Account(account);
      const achStatus = achPaymentsStatusFromV1Account(account);

      await prisma.firm.updateMany({
        where: { stripeConnectAccountId: account.id },
        data: {
          ...clientBillingConnectionData(readiness),
          ...(achStatus ? { stripeAchPaymentsStatus: achStatus } : {}),
        },
      });

      return;
    }

    case "invoice.finalized":
    case "invoice.sent": {
      const invoice = event.data.object as Stripe.Invoice;
      const paymentRefs = paymentRefsFromInvoice(invoice);
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: paymentRefs.paymentIntentId ?? null,
      });

      await syncInvoiceSent(clientInvoice, invoice);

      if (event.type === "invoice.sent") {
        await recordClientBillingActivity(clientInvoice, "Invoice sent to client", `Hosted invoice ${clientInvoice?.invoiceNumber ?? invoice.id} was sent through Stripe.`);
      }
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const inlineRefs = paymentRefsFromInvoice(invoice);
      const paymentRefs = inlineRefs.paymentIntentId
        ? inlineRefs
        : await resolveInvoicePaymentRefs(stripe ?? requireStripeClient(), invoice, {
            stripeAccount: event.account,
            listIfMissing: true,
          });
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: paymentRefs.paymentIntentId ?? null,
      });

      await syncInvoicePaid(clientInvoice, invoice, paymentRefs);
      return;
    }

    case "invoice.voided": {
      const invoice = event.data.object as Stripe.Invoice;
      const paymentRefs = paymentRefsFromInvoice(invoice);
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: paymentRefs.paymentIntentId ?? null,
      });

      if (clientInvoice) {
        await prisma.invoice.update({
          where: { id: clientInvoice.id },
          data: {
            status: InvoiceStatus.WRITTEN_OFF,
            externalInvoiceStatus: invoice.status ?? undefined,
            externalSyncedAt: new Date(),
          },
        });

        await recordClientBillingActivity(clientInvoice, "Invoice voided", `Stripe voided invoice ${clientInvoice.invoiceNumber}.`);
      }

      return;
    }

    case "payment_intent.processing": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent & { invoice?: string | Stripe.Invoice | null };
      const clientInvoice = await findClientInvoiceForProcessingPaymentIntent(paymentIntent, {
        stripe,
        stripeAccount: event.account,
      });
      await markClientInvoicePaymentPending(clientInvoice, paymentIntent.id);
      return;
    }

    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent & { invoice?: string | Stripe.Invoice | null };
      const clientInvoice = await findClientInvoiceForPaymentIntent(paymentIntent);

      if (event.type === "payment_intent.payment_failed") {
        await resetClientInvoicePayment(clientInvoice, {
          paymentIntentId: paymentIntent.id,
          subject: "Payment failed",
          body: `Stripe payment intent ${paymentIntent.id} failed. The fee is unpaid until a later payment succeeds.`,
        });
        return;
      }

      if (clientInvoice) {
        await prisma.invoice.update({
          where: { id: clientInvoice.id },
          data: {
            externalPaymentIntentId: paymentIntent.id,
            externalSyncedAt: new Date(),
          },
        });

        await recordClientBillingActivity(clientInvoice, "Payment received", `Stripe payment intent ${paymentIntent.id} succeeded.`);
      }

      return;
    }

    case "charge.failed": {
      const charge = event.data.object as Stripe.Charge & { payment_intent?: string | Stripe.PaymentIntent | null };
      const paymentIntentId = paymentIntentIdFromUnknown(charge.payment_intent);
      const clientInvoice =
        (await findClientInvoiceByStripeRefs({ paymentIntentId })) ?? (await findClientInvoiceByLocalId(charge.metadata?.invoiceId));

      await resetClientInvoicePayment(clientInvoice, {
        paymentIntentId,
        subject: "Payment failed",
        body: `Stripe reported a failed charge ${charge.id}. The fee is unpaid until a later payment succeeds.`,
      });

      return;
    }

    case "charge.refunded":
    case "charge.dispute.created": {
      const charge = event.data.object as Stripe.Charge & { payment_intent?: string | Stripe.PaymentIntent | null };
      const paymentIntentId = paymentIntentIdFromUnknown(charge.payment_intent);
      const clientInvoice =
        (await findClientInvoiceByStripeRefs({ paymentIntentId })) ?? (await findClientInvoiceByLocalId(charge.metadata?.invoiceId));

      if (event.type === "charge.dispute.created") {
        await resetClientInvoicePayment(clientInvoice, {
          paymentIntentId,
          subject: "Charge dispute created",
          body: `Stripe reported a dispute for charge ${charge.id}. Invoice ${clientInvoice?.invoiceNumber ?? "payment"} is unpaid until a later payment succeeds.`,
          notifyWhenUnchanged: true,
        });
        return;
      }

      if (clientInvoice) {
        await prisma.invoice.update({
          where: { id: clientInvoice.id },
          data: {
            externalSyncedAt: new Date(),
          },
        });

        await recordClientBillingActivity(clientInvoice, "Charge refunded", `Stripe reported a refund for charge ${charge.id}.`);
      }

      return;
    }

    default:
      return;
  }
}

const saasWebhookEventTypes = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

const clientBillingWebhookEventTypes = new Set([
  "account.updated",
  "invoice.finalized",
  "invoice.sent",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided",
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.failed",
  "charge.refunded",
  "charge.dispute.created",
]);

export async function processStripeSaasWebhookEvent(event: Stripe.Event) {
  if (!saasWebhookEventTypes.has(event.type)) {
    return;
  }

  await processStripeWebhookEvent(event);
}

export async function processStripeConnectWebhookEvent(event: Stripe.Event, stripe?: Stripe) {
  if (!clientBillingWebhookEventTypes.has(event.type)) {
    return;
  }

  await processStripeWebhookEvent(event, stripe);
}
