import assert from "node:assert/strict";
import { test } from "node:test";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isIgnorableSignupCompletionError, processStripeWebhookEvent } from "@/lib/billing-webhooks";

test("webhook signup completion ignores expected idempotency and timing errors", () => {
  assert.equal(isIgnorableSignupCompletionError(new Error("Signup request is already being processed.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Checkout is not complete yet.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Checkout payment is not complete yet.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Subscription was not created.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Some other failure")), false);
  assert.equal(isIgnorableSignupCompletionError("not-an-error"), false);
});

test("checkout.session.completed updates signup intent metadata without throwing", async () => {
  let updateManyCalled = false;
  const originalUpdateMany = prisma.signupIntent.updateMany;

  prisma.signupIntent.updateMany = (async (args: unknown) => {
    updateManyCalled = true;
    const payload = args as { where: { id: string }; data: { status: string; stripeCheckoutSessionId: string } };
    assert.equal(payload.where.id, "intent_123");
    assert.equal(payload.data.status, "CHECKOUT_COMPLETED");
    assert.equal(payload.data.stripeCheckoutSessionId, "cs_test_123");
    return { count: 1 };
  }) as typeof prisma.signupIntent.updateMany;

  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    await processStripeWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          metadata: { signupIntentId: "intent_123", priceId: "price_test" },
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    } as never);
  } finally {
    console.warn = originalWarn;
    prisma.signupIntent.updateMany = originalUpdateMany;
  }

  assert.equal(updateManyCalled, true);
});

test("checkout.session.completed ignores events without signup intent metadata", async () => {
  let updateManyCalled = false;
  const originalUpdateMany = prisma.signupIntent.updateMany;

  prisma.signupIntent.updateMany = (async () => {
    updateManyCalled = true;
    return { count: 1 };
  }) as typeof prisma.signupIntent.updateMany;

  try {
    await processStripeWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_no_intent",
          metadata: {},
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    } as never);
  } finally {
    prisma.signupIntent.updateMany = originalUpdateMany;
  }

  assert.equal(updateManyCalled, false);
});

test("subscription webhooks update workspace billing state", async () => {
  let captured: unknown;
  const originalUpdateMany = prisma.firm.updateMany;

  prisma.firm.updateMany = (async (args: unknown) => {
    captured = args;
    return { count: 1 };
  }) as typeof prisma.firm.updateMany;

  try {
    await processStripeWebhookEvent({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          trial_end: 1_900_000_000,
          items: {
            data: [
              {
                current_period_end: 1_900_100_000,
                price: { id: "price_test_active" },
              },
            ],
          },
        },
      },
    } as never);
  } finally {
    prisma.firm.updateMany = originalUpdateMany;
  }

  const payload = captured as {
    where: { OR: Array<Record<string, string>> };
    data: { billingSubscriptionId: string; billingCustomerId: string; billingPriceId: string | null; subscriptionStatus: SubscriptionStatus };
  };
  assert.equal(payload.data.billingSubscriptionId, "sub_123");
  assert.equal(payload.data.billingCustomerId, "cus_123");
  assert.equal(payload.data.billingPriceId, "price_test_active");
  assert.equal(payload.data.subscriptionStatus, SubscriptionStatus.ACTIVE);
});

test("invoice.payment_failed marks subscription as past due", async () => {
  let captured: unknown;
  const originalUpdateMany = prisma.firm.updateMany;

  prisma.firm.updateMany = (async (args: unknown) => {
    captured = args;
    return { count: 1 };
  }) as typeof prisma.firm.updateMany;

  try {
    await processStripeWebhookEvent({
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_123",
          parent: {
            subscription_details: {
              subscription: "sub_123",
            },
          },
        },
      },
    } as never);
  } finally {
    prisma.firm.updateMany = originalUpdateMany;
  }

  const payload = captured as { data: { subscriptionStatus: SubscriptionStatus } };
  assert.equal(payload.data.subscriptionStatus, SubscriptionStatus.PAST_DUE);
});

test("checkout.session.completed with firmId updates firm subscription on conversion", async () => {
  let firmUpdateManyCalled = false;
  let intentUpdateManyCalled = false;
  const originalFirmUpdateMany = prisma.firm.updateMany;
  const originalIntentUpdateMany = prisma.signupIntent.updateMany;
  const originalFirmFindUnique = prisma.firm.findUnique;

  prisma.firm.updateMany = (async (args: unknown) => {
    const payload = args as {
      where: { id: string };
      data: {
        billingCustomerId: string;
        billingSubscriptionId: string;
        subscriptionStatus?: SubscriptionStatus;
        subscriptionPlan: string;
        includedUserLimit: number;
      };
    };
    assert.equal(payload.where.id, "firm_abc");
    assert.equal(payload.data.billingCustomerId, "cus_conv");
    assert.equal(payload.data.billingSubscriptionId, "sub_conv");
    assert.equal(payload.data.subscriptionStatus, undefined);
    assert.equal(payload.data.subscriptionPlan, "SMALL_OFFICE");
    assert.equal(payload.data.includedUserLimit, 3);
    firmUpdateManyCalled = true;
    return { count: 1 };
  }) as typeof prisma.firm.updateMany;

  prisma.signupIntent.updateMany = (async () => {
    intentUpdateManyCalled = true;
    return { count: 0 };
  }) as typeof prisma.signupIntent.updateMany;

  prisma.firm.findUnique = ((async () => ({ id: "firm_abc" })) as unknown) as typeof prisma.firm.findUnique;

  try {
    await processStripeWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_conv_123",
          metadata: { firmId: "firm_abc", planSlug: "small-office" },
          customer: "cus_conv",
          subscription: "sub_conv",
        },
      },
    } as never);
  } finally {
    prisma.firm.updateMany = originalFirmUpdateMany;
    prisma.signupIntent.updateMany = originalIntentUpdateMany;
    prisma.firm.findUnique = originalFirmFindUnique;
  }

  assert.equal(firmUpdateManyCalled, true, "firm.updateMany should be called for conversion");
  assert.equal(intentUpdateManyCalled, false, "signupIntent.updateMany should NOT be called for conversion");
});

test("checkout.session.completed with invalid plan slug does not overwrite plan", async () => {
  let captured: unknown;
  const originalFirmUpdateMany = prisma.firm.updateMany;
  const originalFirmFindUnique = prisma.firm.findUnique;

  prisma.firm.findUnique = ((async () => ({ id: "firm_abc" })) as unknown) as typeof prisma.firm.findUnique;
  prisma.firm.updateMany = (async (args: unknown) => {
    captured = args;
    return { count: 1 };
  }) as typeof prisma.firm.updateMany;

  try {
    await processStripeWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_conv_456",
          payment_status: "paid",
          metadata: { firmId: "firm_abc", planSlug: "enterprise" },
          customer: "cus_conv",
          subscription: "sub_conv",
        },
      },
    } as never);
  } finally {
    prisma.firm.updateMany = originalFirmUpdateMany;
    prisma.firm.findUnique = originalFirmFindUnique;
  }

  const payload = captured as { data: Record<string, unknown> };
  assert.equal(payload.data.subscriptionPlan, undefined);
  assert.equal(payload.data.includedUserLimit, undefined);
});

test("account.updated refreshes client billing readiness", async () => {
  let captured: unknown;
  const originalUpdateMany = prisma.firm.updateMany;

  prisma.firm.updateMany = (async (args: unknown) => {
    captured = args;
    return { count: 1 };
  }) as typeof prisma.firm.updateMany;

  try {
    await processStripeWebhookEvent({
      type: "account.updated",
      data: {
        object: {
          id: "acct_123",
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
        },
      },
    } as never);
  } finally {
    prisma.firm.updateMany = originalUpdateMany;
  }

  const payload = captured as { data: { stripeChargesEnabled: boolean; stripePayoutsEnabled: boolean; stripeDetailsSubmitted: boolean; clientBillingEnabled: boolean } };
  assert.equal(payload.data.stripeChargesEnabled, true);
  assert.equal(payload.data.stripePayoutsEnabled, true);
  assert.equal(payload.data.stripeDetailsSubmitted, true);
  assert.equal(payload.data.clientBillingEnabled, true);
});

test("invoice.paid marks invoice paid and creates a stripe payment", async () => {
  let invoiceUpdateCalled = false;
  let paymentCreateCalled = false;
  let activityCreateCalled = false;
  const originalInvoiceFindFirst = prisma.invoice.findFirst;
  const originalClaimFindUnique = prisma.claim.findUnique;
  const originalTransaction = prisma.$transaction;

  prisma.invoice.findFirst = ((async (args: unknown) => {
    const payload = args as { where: { OR: Array<Record<string, string>> } };
    assert.equal(payload.where.OR.length > 0, true);
    return {
      id: "invoice_123",
      firmId: "firm_123",
      claimId: "claim_123",
      invoiceNumber: "AD-1001",
      feeAmountCents: 12500,
      claim: {
        contactId: "contact_123",
        contact: {
          firstName: "Pat",
          lastName: "Client",
          company: null,
        },
      },
    } as never;
  }) as unknown) as typeof prisma.invoice.findFirst;

  prisma.claim.findUnique = ((async () => ({
    contactId: "contact_123",
    contact: {
      firstName: "Pat",
      lastName: "Client",
      company: null,
    },
  })) as unknown) as typeof prisma.claim.findUnique;

  prisma.$transaction = ((async (callback: (tx: unknown) => Promise<unknown>) => {
    const fakeTx = {
      invoice: {
        update: async () => {
          invoiceUpdateCalled = true;
          return null;
        },
      },
      payment: {
        findFirst: async () => null,
        update: async () => null,
        create: async (args: unknown) => {
          paymentCreateCalled = true;
          const payload = args as { data: { source: string; amountCents: number; externalProvider: string } };
          assert.equal(payload.data.source, "STRIPE");
          assert.equal(payload.data.externalProvider, "stripe_connect");
          assert.equal(payload.data.amountCents, 12500);
          return null;
        },
      },
      activity: {
        create: async (args: unknown) => {
          activityCreateCalled = true;
          const payload = args as { data: { subject: string } };
          assert.equal(payload.data.subject, "Invoice paid");
          return null;
        },
      },
    };

    return callback(fakeTx as never);
  }) as unknown) as typeof prisma.$transaction;

  try {
    await processStripeWebhookEvent({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_123",
          status: "paid",
          amount_due: 12500,
          amount_paid: 12500,
          payment_intent: "pi_123",
          charge: "ch_123",
          customer: "cus_123",
        },
      },
    } as never);
  } finally {
    prisma.invoice.findFirst = originalInvoiceFindFirst;
    prisma.claim.findUnique = originalClaimFindUnique;
    prisma.$transaction = originalTransaction;
  }

  assert.equal(invoiceUpdateCalled, true);
  assert.equal(paymentCreateCalled, true);
  assert.equal(activityCreateCalled, true);
});
