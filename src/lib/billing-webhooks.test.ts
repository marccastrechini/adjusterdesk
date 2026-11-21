import assert from "node:assert/strict";
import { test } from "node:test";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isIgnorableSignupCompletionError, processStripeConnectWebhookEvent, processStripeWebhookEvent } from "@/lib/billing-webhooks";

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
  let storedPaymentIntentId: string | undefined;
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
        update: async (args: unknown) => {
          invoiceUpdateCalled = true;
          const payload = args as { data: { externalPaymentIntentId?: string; status: string; externalPaymentStatus?: string } };
          storedPaymentIntentId = payload.data.externalPaymentIntentId;
          assert.equal(payload.data.status, "PAID");
          assert.equal(payload.data.externalPaymentStatus, "succeeded");
          return null;
        },
      },
      payment: {
        findFirst: async () => null,
        update: async () => null,
        create: async (args: unknown) => {
          paymentCreateCalled = true;
          const payload = args as { data: { source: string; amountCents: number; externalProvider: string; externalPaymentId?: string } };
          assert.equal(payload.data.source, "STRIPE");
          assert.equal(payload.data.externalProvider, "stripe_connect");
          assert.equal(payload.data.amountCents, 12500);
          assert.equal(payload.data.externalPaymentId, "pi_123");
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
          customer: "cus_123",
          payments: {
            data: [
              {
                status: "paid",
                is_default: true,
                payment: { type: "payment_intent", payment_intent: "pi_123", charge: "ch_123" },
              },
            ],
          },
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
  assert.equal(storedPaymentIntentId, "pi_123");
});

test("invoice.paid lists invoice payments when the payload has no PaymentIntent id", async () => {
  let storedPaymentIntentId: string | undefined;
  const listCalls: Array<{ params: { invoice?: string }; options?: { stripeAccount?: string } }> = [];
  const originalInvoiceFindFirst = prisma.invoice.findFirst;
  const originalClaimFindUnique = prisma.claim.findUnique;
  const originalTransaction = prisma.$transaction;

  prisma.invoice.findFirst = (async () => ({
    id: "invoice_123",
    firmId: "firm_123",
    claimId: "claim_123",
    invoiceNumber: "AD-1001",
    feeAmountCents: 12500,
    claim: { contactId: "contact_123", contact: { firstName: "Pat", lastName: "Client", company: null } },
  })) as unknown as typeof prisma.invoice.findFirst;
  prisma.claim.findUnique = (async () => ({
    contactId: "contact_123",
    contact: { firstName: "Pat", lastName: "Client", company: null },
  })) as unknown as typeof prisma.claim.findUnique;
  prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      invoice: {
        update: async (args: unknown) => {
          storedPaymentIntentId = (args as { data: { externalPaymentIntentId?: string } }).data.externalPaymentIntentId;
          return null;
        },
      },
      payment: {
        findFirst: async () => null,
        update: async () => null,
        create: async (args: unknown) => {
          assert.equal((args as { data: { externalPaymentId?: string } }).data.externalPaymentId, "pi_listed");
          return null;
        },
      },
      activity: { create: async () => null },
    })) as unknown as typeof prisma.$transaction;

  const stripe = {
    invoicePayments: {
      list: async (params: { invoice?: string }, options?: { stripeAccount?: string }) => {
        listCalls.push({ params, options });
        return {
          data: [
            {
              status: "paid",
              payment: { type: "payment_intent", payment_intent: "pi_listed" },
            },
          ],
        };
      },
    },
  };

  try {
    await processStripeWebhookEvent(
      {
        type: "invoice.paid",
        account: "acct_connected",
        data: {
          object: {
            id: "in_123",
            status: "paid",
            amount_due: 12500,
            amount_paid: 12500,
          },
        },
      } as never,
      stripe as never,
    );
  } finally {
    prisma.invoice.findFirst = originalInvoiceFindFirst;
    prisma.claim.findUnique = originalClaimFindUnique;
    prisma.$transaction = originalTransaction;
  }

  assert.equal(listCalls.length, 1);
  assert.equal(listCalls[0]?.params.invoice, "in_123");
  assert.equal(listCalls[0]?.options?.stripeAccount, "acct_connected");
  assert.equal(storedPaymentIntentId, "pi_listed");
});

function clientInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "invoice_123",
    firmId: "firm_123",
    claimId: "claim_123",
    invoiceNumber: "AD-1001",
    status: "SENT",
    feeAmountCents: 12500,
    amountPaidCents: 0,
    paidAt: null,
    externalPaymentStatus: null,
    externalPaymentIntentId: null,
    claim: { contactId: "contact_123", contact: { firstName: "Pat", lastName: "Client", company: null } },
    ...overrides,
  };
}

test("payment_intent.processing keeps the fee uncollected and notifies once", async () => {
  let storedStatus: string | null = null;
  let storedPaymentIntentId: string | null = null;
  let invoiceStatus: string | undefined;
  let activityCount = 0;
  let paymentWrites = 0;
  const originalFind = prisma.invoice.findFirst;
  const originalClaimFind = prisma.claim.findUnique;
  const originalUpdate = prisma.invoice.update;
  const originalActivity = prisma.activity.create;
  const originalPaymentCreate = prisma.payment.create;

  prisma.invoice.findFirst = (async () =>
    clientInvoice({ externalPaymentStatus: storedStatus, externalPaymentIntentId: storedPaymentIntentId })) as unknown as typeof prisma.invoice.findFirst;
  prisma.claim.findUnique = (async () => ({ contactId: "contact_123" })) as unknown as typeof prisma.claim.findUnique;
  prisma.invoice.update = (async (args: { data: { externalPaymentStatus?: string; externalPaymentIntentId?: string; status?: string } }) => {
    storedStatus = args.data.externalPaymentStatus ?? storedStatus;
    storedPaymentIntentId = args.data.externalPaymentIntentId ?? storedPaymentIntentId;
    invoiceStatus = args.data.status;
    return null;
  }) as unknown as typeof prisma.invoice.update;
  prisma.activity.create = (async (args: { data: { subject: string } }) => {
    activityCount += 1;
    assert.equal(args.data.subject, "Payment pending");
    return null;
  }) as unknown as typeof prisma.activity.create;
  prisma.payment.create = (async () => {
    paymentWrites += 1;
    return null;
  }) as unknown as typeof prisma.payment.create;

  const event = {
    type: "payment_intent.processing",
    account: "acct_connected",
    data: { object: { id: "pi_ach", status: "processing", metadata: { invoiceId: "invoice_123" } } },
  } as never;

  try {
    await processStripeConnectWebhookEvent(event);
    await processStripeConnectWebhookEvent(event);
  } finally {
    prisma.invoice.findFirst = originalFind;
    prisma.claim.findUnique = originalClaimFind;
    prisma.invoice.update = originalUpdate;
    prisma.activity.create = originalActivity;
    prisma.payment.create = originalPaymentCreate;
  }

  assert.equal(storedStatus, "processing");
  assert.equal(storedPaymentIntentId, "pi_ach");
  assert.equal(invoiceStatus, undefined);
  assert.equal(activityCount, 1);
  assert.equal(paymentWrites, 0);
});

test("payment_intent.processing lists invoice payments when the PaymentIntent has no invoice", async () => {
  const listCalls: Array<{ params: { payment?: { type?: string; payment_intent?: string } }; options?: { stripeAccount?: string } }> = [];
  let storedStatus: string | null = null;
  let storedPaymentIntentId: string | null = null;
  let activityCount = 0;
  let paymentWrites = 0;
  const originalFind = prisma.invoice.findFirst;
  const originalClaimFind = prisma.claim.findUnique;
  const originalUpdate = prisma.invoice.update;
  const originalActivity = prisma.activity.create;
  const originalPaymentCreate = prisma.payment.create;

  prisma.invoice.findFirst = (async (args: { where: { id?: string; OR?: Array<Record<string, string>> } }) => {
    const matchesStripeInvoice = args.where.OR?.some((entry) => entry.externalInvoiceId === "in_ach");
    const matchesStoredIntent = Boolean(storedPaymentIntentId) && args.where.OR?.some((entry) => entry.externalPaymentIntentId === storedPaymentIntentId);
    if (!matchesStripeInvoice && !matchesStoredIntent) {
      return null;
    }

    return clientInvoice({
      externalInvoiceId: "in_ach",
      externalPaymentStatus: storedStatus,
      externalPaymentIntentId: storedPaymentIntentId,
    });
  }) as unknown as typeof prisma.invoice.findFirst;
  prisma.claim.findUnique = (async () => ({ contactId: "contact_123" })) as unknown as typeof prisma.claim.findUnique;
  prisma.invoice.update = (async (args: { data: { externalPaymentStatus?: string; externalPaymentIntentId?: string; status?: string } }) => {
    storedStatus = args.data.externalPaymentStatus ?? storedStatus;
    storedPaymentIntentId = args.data.externalPaymentIntentId ?? storedPaymentIntentId;
    assert.equal(args.data.status, undefined);
    return null;
  }) as unknown as typeof prisma.invoice.update;
  prisma.activity.create = (async (args: { data: { subject: string } }) => {
    activityCount += 1;
    assert.equal(args.data.subject, "Payment pending");
    return null;
  }) as unknown as typeof prisma.activity.create;
  prisma.payment.create = (async () => {
    paymentWrites += 1;
    return null;
  }) as unknown as typeof prisma.payment.create;

  const stripe = {
    invoicePayments: {
      list: async (params: { payment?: { type?: string; payment_intent?: string } }, options?: { stripeAccount?: string }) => {
        listCalls.push({ params, options });
        return { data: [{ status: "open", invoice: "in_ach", payment: { type: "payment_intent", payment_intent: "pi_ach" } }] };
      },
    },
  };
  const event = {
    type: "payment_intent.processing",
    account: "acct_connected",
    data: { object: { id: "pi_ach", status: "processing", invoice: null, metadata: {} } },
  } as never;

  try {
    await processStripeConnectWebhookEvent(event, stripe as never);
    await processStripeConnectWebhookEvent(event, stripe as never);
  } finally {
    prisma.invoice.findFirst = originalFind;
    prisma.claim.findUnique = originalClaimFind;
    prisma.invoice.update = originalUpdate;
    prisma.activity.create = originalActivity;
    prisma.payment.create = originalPaymentCreate;
  }

  assert.equal(listCalls.length, 1);
  assert.equal(listCalls[0]?.params.payment?.type, "payment_intent");
  assert.equal(listCalls[0]?.params.payment?.payment_intent, "pi_ach");
  assert.equal(listCalls[0]?.options?.stripeAccount, "acct_connected");
  assert.equal(storedStatus, "processing");
  assert.equal(storedPaymentIntentId, "pi_ach");
  assert.equal(activityCount, 1);
  assert.equal(paymentWrites, 0);
});

test("ACH failures and disputes uncollect the fee and notify the office", async () => {
  const originalFind = prisma.invoice.findFirst;
  const originalTransaction = prisma.$transaction;
  const originalUpdateMany = prisma.firm.updateMany;
  let saasUpdateCalled = false;
  let deletedStripePayment = false;
  let restoredStatus: string | undefined;
  let restoredAmount: number | undefined;
  let failureSubject: string | undefined;

  prisma.firm.updateMany = (async () => {
    saasUpdateCalled = true;
    return { count: 1 };
  }) as unknown as typeof prisma.firm.updateMany;
  prisma.invoice.findFirst = (async () =>
    clientInvoice({
      status: "PAID",
      amountPaidCents: 12500,
      paidAt: new Date("2026-11-01T00:00:00Z"),
      externalPaymentStatus: "succeeded",
      externalPaymentIntentId: "pi_ach",
    })) as unknown as typeof prisma.invoice.findFirst;
  prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      payment: {
        findMany: async (args: { where: { source?: string; externalPaymentId?: string } }) => {
          if (args.where.source === "STRIPE") {
            return [{ id: "pay_stripe", amountCents: 12500, source: "STRIPE", externalPaymentId: "pi_ach" }];
          }
          return [{ id: "pay_manual", amountCents: 2000, source: "MANUAL" }];
        },
        deleteMany: async () => {
          deletedStripePayment = true;
          return { count: 1 };
        },
      },
      invoice: {
        update: async (args: { data: { status: string; amountPaidCents: number; externalPaymentStatus: string; paidAt: Date | null } }) => {
          restoredStatus = args.data.status;
          restoredAmount = args.data.amountPaidCents;
          assert.equal(args.data.externalPaymentStatus, "failed");
          assert.equal(args.data.paidAt, null);
          return null;
        },
      },
      claim: {
        findUnique: async () => ({ contactId: "contact_123" }),
      },
      activity: {
        create: async (args: { data: { subject: string } }) => {
          failureSubject = args.data.subject;
          return null;
        },
      },
    })) as unknown as typeof prisma.$transaction;

  try {
    await processStripeConnectWebhookEvent({
      type: "invoice.payment_failed",
      account: "acct_connected",
      data: {
        object: {
          id: "in_123",
          status: "open",
          payments: { data: [{ status: "open", payment: { payment_intent: "pi_ach" } }] },
        },
      },
    } as never);
    assert.equal(saasUpdateCalled, false);
    assert.equal(deletedStripePayment, true);
    assert.equal(restoredStatus, "PARTIALLY_PAID");
    assert.equal(restoredAmount, 2000);
    assert.equal(failureSubject, "Invoice payment failed");

    deletedStripePayment = false;
    failureSubject = undefined;
    prisma.invoice.findFirst = (async () =>
      clientInvoice({
        status: "PAID",
        amountPaidCents: 12500,
        externalPaymentStatus: "succeeded",
        externalPaymentIntentId: "pi_ach",
      })) as unknown as typeof prisma.invoice.findFirst;
    prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        payment: {
          findMany: async (args: { where: { source?: string } }) => (args.where.source === "STRIPE" ? [{ id: "pay_stripe", amountCents: 12500 }] : []),
          deleteMany: async () => {
            deletedStripePayment = true;
            return { count: 1 };
          },
        },
        invoice: {
          update: async (args: { data: { status: string; amountPaidCents: number } }) => {
            restoredStatus = args.data.status;
            restoredAmount = args.data.amountPaidCents;
            return null;
          },
        },
        claim: { findUnique: async () => ({ contactId: "contact_123" }) },
        activity: {
          create: async (args: { data: { subject: string } }) => {
            failureSubject = args.data.subject;
            return null;
          },
        },
      })) as unknown as typeof prisma.$transaction;

    await processStripeWebhookEvent({
      type: "charge.dispute.created",
      data: { object: { id: "ch_ach", payment_intent: "pi_ach" } },
    } as never);
    assert.equal(deletedStripePayment, true);
    assert.equal(restoredStatus, "SENT");
    assert.equal(restoredAmount, 0);
    assert.equal(failureSubject, "Charge dispute created");

    failureSubject = undefined;
    await processStripeWebhookEvent({
      type: "charge.failed",
      data: { object: { id: "ch_failed", payment_intent: "pi_ach", metadata: { invoiceId: "invoice_123" } } },
    } as never);
    assert.equal(failureSubject, "Payment failed");
  } finally {
    prisma.invoice.findFirst = originalFind;
    prisma.$transaction = originalTransaction;
    prisma.firm.updateMany = originalUpdateMany;
  }
});

test("account.updated stores the v1 ACH capability status", async () => {
  let captured: { data: { stripeAchPaymentsStatus?: string } } | undefined;
  const originalUpdateMany = prisma.firm.updateMany;
  prisma.firm.updateMany = (async (args: { data: { stripeAchPaymentsStatus?: string } }) => {
    captured = args;
    return { count: 1 };
  }) as unknown as typeof prisma.firm.updateMany;

  try {
    await processStripeWebhookEvent({
      type: "account.updated",
      data: {
        object: {
          id: "acct_legacy",
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
          capabilities: { us_bank_account_ach_payments: "active" },
        },
      },
    } as never);
  } finally {
    prisma.firm.updateMany = originalUpdateMany;
  }

  assert.equal(captured?.data.stripeAchPaymentsStatus, "active");
});
