import type Stripe from "stripe";
import { ActivityType, ClientBillingConnectionStatus, ClientPaymentSource, InvoiceStatus, SubscriptionStatus } from "@/generated/prisma/client";
import { defaultLimitForPlan, findPublicPlanBySlug, mapStripeSubscriptionStatus, parsePlanSlug, resolveStripePriceId } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { completeStripeSignupFromSessionId } from "@/lib/signup";

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

async function syncInvoicePaid(invoice: Awaited<ReturnType<typeof findClientInvoiceByStripeRefs>>, stripeInvoice: Stripe.Invoice) {
  if (!invoice) {
    return;
  }

  const invoiceRecord = stripeInvoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent | null;
    charge?: string | Stripe.Charge | null;
  };
  const paymentIntentId = typeof invoiceRecord.payment_intent === "string" ? invoiceRecord.payment_intent : invoiceRecord.payment_intent?.id ?? null;
  const chargeId = typeof invoiceRecord.charge === "string" ? invoiceRecord.charge : invoiceRecord.charge?.id ?? null;
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

async function syncInvoiceSent(invoice: Awaited<ReturnType<typeof findClientInvoiceByStripeRefs>>, stripeInvoice: Stripe.Invoice) {
  if (!invoice) {
    return;
  }

  const invoiceRecord = stripeInvoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null };

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.SENT,
      sentToClientAt: invoice.sentToClientAt ?? new Date(),
      externalInvoiceStatus: stripeInvoice.status ?? undefined,
      externalHostedInvoiceUrl: stripeInvoice.hosted_invoice_url ?? undefined,
      externalInvoicePdfUrl: stripeInvoice.invoice_pdf ?? undefined,
      externalPaymentIntentId: typeof invoiceRecord.payment_intent === "string" ? invoiceRecord.payment_intent : invoiceRecord.payment_intent?.id ?? undefined,
      externalAmountDueCents: stripeInvoice.amount_due ?? undefined,
      externalAmountPaidCents: stripeInvoice.amount_paid ?? undefined,
      externalSyncedAt: new Date(),
    },
  });

}

export async function processStripeWebhookEvent(event: Stripe.Event) {
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

      await updateFirmBySubscriptionOrCustomer({
        subscriptionId,
        customerId,
        data: {
          subscriptionStatus: SubscriptionStatus.PAST_DUE,
        },
      });

      const invoiceRecord = invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null };
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: typeof invoiceRecord.payment_intent === "string" ? invoiceRecord.payment_intent : invoiceRecord.payment_intent?.id ?? null,
      });

      await recordClientBillingActivity(clientInvoice, "Invoice payment failed", `Stripe reported a payment failure for invoice ${clientInvoice?.invoiceNumber ?? invoice.id}.`);

      return;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const chargesEnabled = Boolean(account.charges_enabled);
      const payoutsEnabled = Boolean(account.payouts_enabled);
      const detailsSubmitted = Boolean(account.details_submitted);
      const active = chargesEnabled && payoutsEnabled && detailsSubmitted;

      await prisma.firm.updateMany({
        where: { stripeConnectAccountId: account.id },
        data: {
          stripeChargesEnabled: chargesEnabled,
          stripePayoutsEnabled: payoutsEnabled,
          stripeDetailsSubmitted: detailsSubmitted,
          clientBillingConnectionStatus: active ? ClientBillingConnectionStatus.ACTIVE : ClientBillingConnectionStatus.RESTRICTED,
          clientBillingEnabled: active,
        },
      });

      return;
    }

    case "invoice.finalized":
    case "invoice.sent": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceRecord = invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null };
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: typeof invoiceRecord.payment_intent === "string" ? invoiceRecord.payment_intent : invoiceRecord.payment_intent?.id ?? null,
      });

      await syncInvoiceSent(clientInvoice, invoice);

      if (event.type === "invoice.sent") {
        await recordClientBillingActivity(clientInvoice, "Invoice sent to client", `Hosted invoice ${clientInvoice?.invoiceNumber ?? invoice.id} was sent through Stripe.`);
      }
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceRecord = invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null };
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: typeof invoiceRecord.payment_intent === "string" ? invoiceRecord.payment_intent : invoiceRecord.payment_intent?.id ?? null,
      });

      await syncInvoicePaid(clientInvoice, invoice);
      return;
    }

    case "invoice.voided": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceRecord = invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null };
      const clientInvoice = await findClientInvoiceByStripeRefs({
        invoiceId: invoice.id,
        paymentIntentId: typeof invoiceRecord.payment_intent === "string" ? invoiceRecord.payment_intent : invoiceRecord.payment_intent?.id ?? null,
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

    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent & { invoice?: string | Stripe.Invoice | null };
      const clientInvoice = await findClientInvoiceByStripeRefs({
        paymentIntentId: paymentIntent.id,
        invoiceId: typeof paymentIntent.invoice === "string" ? paymentIntent.invoice : paymentIntent.invoice?.id ?? null,
      });

      if (clientInvoice) {
        await prisma.invoice.update({
          where: { id: clientInvoice.id },
          data: {
            externalPaymentIntentId: paymentIntent.id,
            externalSyncedAt: new Date(),
          },
        });

        if (event.type === "payment_intent.succeeded") {
          await recordClientBillingActivity(clientInvoice, "Payment received", `Stripe payment intent ${paymentIntent.id} succeeded.`);
        } else {
          await recordClientBillingActivity(clientInvoice, "Payment failed", `Stripe payment intent ${paymentIntent.id} failed.`);
        }
      }

      return;
    }

    case "charge.refunded":
    case "charge.dispute.created": {
      const charge = event.data.object as Stripe.Charge & { payment_intent?: string | Stripe.PaymentIntent | null };
      const clientInvoice = await findClientInvoiceByStripeRefs({
        paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null,
      });

      if (clientInvoice) {
        await prisma.invoice.update({
          where: { id: clientInvoice.id },
          data: {
            externalSyncedAt: new Date(),
          },
        });

        await recordClientBillingActivity(
          clientInvoice,
          event.type === "charge.refunded" ? "Charge refunded" : "Charge dispute created",
          event.type === "charge.refunded"
            ? `Stripe reported a refund for charge ${charge.id}.`
            : `Stripe reported a dispute for charge ${charge.id}.`,
        );
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
  "invoice.voided",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
]);

export async function processStripeSaasWebhookEvent(event: Stripe.Event) {
  if (!saasWebhookEventTypes.has(event.type)) {
    return;
  }

  await processStripeWebhookEvent(event);
}

export async function processStripeConnectWebhookEvent(event: Stripe.Event) {
  if (!clientBillingWebhookEventTypes.has(event.type)) {
    return;
  }

  await processStripeWebhookEvent(event);
}
