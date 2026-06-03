import type Stripe from "stripe";
import { SubscriptionStatus } from "@/generated/prisma/client";
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

      return;
    }

    default:
      return;
  }
}
