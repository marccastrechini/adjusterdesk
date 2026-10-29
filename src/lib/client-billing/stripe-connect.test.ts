import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  clientBillingReadinessFromV1Account,
  clientBillingReadinessFromV2Account,
  clientBillingStripeErrorLogFields,
  coerceClientBillingConnectionStatus,
  hostedInvoicePresentation,
  isLegacyExpressConnectedAccount,
  logClientBillingStripeError,
  merchantAccountCreateParams,
  paymentRefsFromInvoice,
  statementDescriptorFromBusinessName,
  v2OnboardingLinkParams,
  v2PublicBusinessNameUpdateParams,
} from "@/lib/client-billing/stripe-connect-account";
import {
  createOrResumeStripeConnectAccount,
  processStripeConnectV2AccountNotification,
  refreshStripeConnectAccount,
  sendStripeConnectInvoice,
} from "@/lib/client-billing/stripe-connect-provider";

const originalBaseUrl = process.env.APP_BASE_URL;

test("new connected accounts use Accounts v2 merchant direct charges", () => {
  const params = merchantAccountCreateParams({
    id: "firm_123",
    name: "North Office",
    email: " office@example.com ",
  });

  assert.equal(params.dashboard, "full");
  assert.equal(params.defaults?.responsibilities?.fees_collector, "stripe");
  assert.equal(params.defaults?.responsibilities?.losses_collector, "stripe");
  assert.equal(params.configuration?.merchant?.capabilities?.card_payments?.requested, true);
  assert.equal(params.configuration?.customer, undefined);
  assert.equal(params.configuration?.recipient, undefined);
  assert.equal(params.contact_email, "office@example.com");
  assert.equal(params.identity?.country, "us");
  assert.equal(params.display_name, "North Office");
  assert.equal(params.defaults?.profile?.doing_business_as, "North Office");
  assert.equal(params.configuration?.merchant?.statement_descriptor, undefined);
  assert.deepEqual(params.metadata, { firmId: "firm_123" });
  assert.equal("type" in params, false);

  const link = v2OnboardingLinkParams("acct_v2", "https://sandbox.paclaimboard.com");
  assert.equal(link.use_case.type, "account_onboarding");
  assert.deepEqual(link.use_case.account_onboarding?.configurations, ["merchant"]);
  assert.equal(link.use_case.account_onboarding?.refresh_url, "https://sandbox.paclaimboard.com/settings/client-payments");
});

test("v2 capability status maps charges, payouts, and submitted details", () => {
  const active = clientBillingReadinessFromV2Account({
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { status: "active" },
          stripe_balance: { payouts: { status: "active" } },
        },
      },
    },
    requirements: { entries: [] },
  });
  assert.deepEqual(active, { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true });

  const onboarding = clientBillingReadinessFromV2Account({
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { status: "pending" },
          stripe_balance: { payouts: { status: "pending" } },
        },
      },
    },
    requirements: {
      entries: [{ awaiting_action_from: "user", minimum_deadline: { status: "currently_due" } }],
    },
  });
  assert.deepEqual(onboarding, { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });

  const reviewing = clientBillingReadinessFromV2Account({
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { status: "pending" },
          stripe_balance: { payouts: { status: "restricted" } },
        },
      },
    },
    requirements: {
      entries: [{ awaiting_action_from: "stripe", minimum_deadline: { status: "currently_due" } }],
    },
  });
  assert.equal(reviewing?.detailsSubmitted, true);
  assert.equal(reviewing?.chargesEnabled, false);
});

test("legacy Express accounts stay on the v1 readiness fields", () => {
  assert.equal(
    isLegacyExpressConnectedAccount({
      dashboard: "express",
      defaults: { responsibilities: { fees_collector: "application_express", losses_collector: "application" } },
    }),
    true,
  );
  assert.equal(
    isLegacyExpressConnectedAccount({
      dashboard: "full",
      defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
    }),
    false,
  );
  assert.deepEqual(
    clientBillingReadinessFromV1Account({
      charges_enabled: true,
      payouts_enabled: false,
      details_submitted: true,
    }),
    { chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true },
  );
});

test("Connect onboarding logs Stripe failures without secrets", () => {
  const error = new Stripe.errors.StripeInvalidRequestError({
    message: "Accounts v1 is no longer recommended. Key sk_test_secretvalue",
    type: "invalid_request_error",
    code: "accounts_v1_deprecated",
    requestId: "req_SiIyh24p0sVKTJ",
    statusCode: 400,
    headers: { authorization: "Bearer sk_test_secretvalue" },
  });
  const fields = clientBillingStripeErrorLogFields(error);
  const serialized = JSON.stringify(fields);

  assert.equal(fields.requestId, "req_SiIyh24p0sVKTJ");
  assert.equal(fields.code, "accounts_v1_deprecated");
  assert.equal(fields.statusCode, 400);
  assert.equal(serialized.includes("sk_test_secretvalue"), false);
  assert.equal(serialized.includes("authorization"), false);
  assert.equal(serialized.includes("[redacted]"), true);

  const logged: unknown[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    logClientBillingStripeError("Stripe Connect onboarding failed.", error);
  } finally {
    console.error = originalError;
  }

  const logText = JSON.stringify(logged);
  assert.equal(logText.includes("Stripe Connect onboarding failed."), true);
  assert.equal(logText.includes("req_SiIyh24p0sVKTJ"), true);
  assert.equal(logText.includes("sk_test_secretvalue"), false);
});

function firm(overrides: Record<string, unknown> = {}) {
  return {
    id: "firm_123",
    name: "North Office",
    email: "office@example.com",
    stripeConnectAccountId: null,
    ...overrides,
  } as never;
}

test("creating a connected account calls Accounts v2 and a v2 account link", async () => {
  process.env.APP_BASE_URL = "https://sandbox.paclaimboard.com";
  const calls: string[] = [];
  let storedAccountId: string | undefined;
  const originalUpdate = prisma.firm.update;
  prisma.firm.update = (async (args: { data: { stripeConnectAccountId?: string } }) => {
    storedAccountId = args.data.stripeConnectAccountId;
    return { id: "firm_123" };
  }) as unknown as typeof prisma.firm.update;

  const stripe = {
    v2: {
      core: {
        accounts: {
          create: async (params: { dashboard?: string }) => {
            calls.push(`v2.create:${params.dashboard}`);
            return { id: "acct_v2_new" };
          },
          retrieve: async () => {
            throw new Error("retrieve should not run for a new account");
          },
        },
        accountLinks: {
          create: async (params: { account: string; use_case: { type: string } }) => {
            calls.push(`v2.link:${params.account}:${params.use_case.type}`);
            return { url: "https://connect.stripe.test/v2/onboarding" };
          },
        },
      },
    },
    accounts: {
      create: async () => {
        throw new Error("v1 accounts.create must not be called");
      },
      retrieve: async () => {
        throw new Error("v1 accounts.retrieve should not run for a new account");
      },
    },
    accountLinks: {
      create: async () => {
        throw new Error("v1 account link should not run for a new v2 account");
      },
    },
  } as never;

  try {
    const result = await createOrResumeStripeConnectAccount(firm(), stripe);
    assert.equal(result.url, "https://connect.stripe.test/v2/onboarding");
    assert.equal(storedAccountId, "acct_v2_new");
    assert.deepEqual(calls, ["v2.create:full", "v2.link:acct_v2_new:account_onboarding"]);
  } finally {
    prisma.firm.update = originalUpdate;
    if (originalBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = originalBaseUrl;
    }
  }
});

test("an existing Express account resumes with a v1 account link", async () => {
  process.env.APP_BASE_URL = "https://sandbox.paclaimboard.com";
  const calls: string[] = [];
  const originalUpdate = prisma.firm.update;
  prisma.firm.update = (async () => ({ id: "firm_123" })) as unknown as typeof prisma.firm.update;

  const stripe = {
    v2: {
      core: {
        accounts: {
          create: async () => {
            throw new Error("v2 create must not run when an account id already exists");
          },
          retrieve: async (id: string) => {
            calls.push(`v2.retrieve:${id}`);
            return {
              id,
              dashboard: "express",
              defaults: { responsibilities: { fees_collector: "application_express", losses_collector: "application" } },
            };
          },
        },
        accountLinks: {
          create: async () => {
            throw new Error("v2 account link must not run for a legacy Express account");
          },
        },
      },
    },
    accounts: {
      create: async () => {
        throw new Error("v1 accounts.create must not be called");
      },
      retrieve: async () => {
        throw new Error("not used");
      },
    },
    accountLinks: {
      create: async (params: { account: string; type: string }) => {
        calls.push(`v1.link:${params.account}:${params.type}`);
        return { url: "https://connect.stripe.test/v1/onboarding" };
      },
    },
  } as never;

  try {
    const result = await createOrResumeStripeConnectAccount(firm({ stripeConnectAccountId: "acct_legacy" }), stripe);
    assert.equal(result.url, "https://connect.stripe.test/v1/onboarding");
    assert.deepEqual(calls, ["v2.retrieve:acct_legacy", "v1.link:acct_legacy:account_onboarding"]);
  } finally {
    prisma.firm.update = originalUpdate;
    if (originalBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = originalBaseUrl;
    }
  }
});

test("refresh reads v2 merchant capabilities for a new account", async () => {
  let captured: { data: Record<string, unknown> } | undefined;
  const originalUpdate = prisma.firm.update;
  prisma.firm.update = (async (args: { data: Record<string, unknown> }) => {
    captured = args;
    return { id: "firm_123" };
  }) as unknown as typeof prisma.firm.update;

  const stripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async () => ({
            id: "acct_v2_new",
            dashboard: "full",
            defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
            configuration: {
              merchant: {
                capabilities: {
                  card_payments: { status: "active" },
                  stripe_balance: { payouts: { status: "active" } },
                },
              },
            },
            requirements: { entries: [] },
          }),
          update: async () => ({ id: "acct_v2_new" }),
        },
      },
    },
    accounts: {
      retrieve: async () => {
        throw new Error("v1 retrieve should not run when v2 capabilities are present");
      },
    },
  } as never;

  try {
    const result = await refreshStripeConnectAccount(firm({ stripeConnectAccountId: "acct_v2_new" }), stripe);
    assert.equal(result.ready, true);
    assert.equal(result.connectionStatus, "ACTIVE");
    assert.equal(captured?.data.stripeChargesEnabled, true);
    assert.equal(captured?.data.stripePayoutsEnabled, true);
    assert.equal(captured?.data.stripeDetailsSubmitted, true);
    assert.equal(captured?.data.clientBillingEnabled, true);
  } finally {
    prisma.firm.update = originalUpdate;
  }
});

test("refresh keeps using v1 account fields for a legacy Express account", async () => {
  let captured: { data: Record<string, unknown> } | undefined;
  const originalUpdate = prisma.firm.update;
  prisma.firm.update = (async (args: { data: Record<string, unknown> }) => {
    captured = args;
    return { id: "firm_123" };
  }) as unknown as typeof prisma.firm.update;

  const stripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async () => ({
            id: "acct_legacy",
            dashboard: "express",
            defaults: { responsibilities: { fees_collector: "application_express" } },
            configuration: {
              merchant: {
                capabilities: {
                  card_payments: { status: "active" },
                  stripe_balance: { payouts: { status: "active" } },
                },
              },
            },
          }),
        },
      },
    },
    accounts: {
      retrieve: async (id: string) => ({
        id,
        charges_enabled: true,
        payouts_enabled: false,
        details_submitted: true,
      }),
      update: async () => ({ id: "acct_legacy" }),
    },
  } as never;

  try {
    const result = await refreshStripeConnectAccount(firm({ stripeConnectAccountId: "acct_legacy" }), stripe);
    assert.equal(result.ready, false);
    assert.equal(captured?.data.stripeChargesEnabled, true);
    assert.equal(captured?.data.stripePayoutsEnabled, false);
    assert.equal(captured?.data.stripeDetailsSubmitted, true);
    assert.equal(captured?.data.clientBillingEnabled, false);
  } finally {
    prisma.firm.update = originalUpdate;
  }
});

test("v2 account notifications refresh the matching firm and ignore other events", async () => {
  let retrieveCalled = false;
  const originalFindFirst = prisma.firm.findFirst;
  const originalUpdate = prisma.firm.update;
  prisma.firm.findFirst = (async () => firm({ stripeConnectAccountId: "acct_v2_new" })) as unknown as typeof prisma.firm.findFirst;
  prisma.firm.update = (async () => ({ id: "firm_123" })) as unknown as typeof prisma.firm.update;

  const stripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async () => {
            retrieveCalled = true;
            return {
              id: "acct_v2_new",
              dashboard: "full",
              defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
              configuration: {
                merchant: {
                  capabilities: {
                    card_payments: { status: "pending" },
                    stripe_balance: { payouts: { status: "pending" } },
                  },
                },
              },
              requirements: {
                entries: [{ awaiting_action_from: "user", minimum_deadline: { status: "currently_due" } }],
              },
            };
          },
          update: async () => ({ id: "acct_v2_new" }),
        },
      },
    },
    accounts: {
      retrieve: async () => {
        throw new Error("v1 retrieve should not run");
      },
    },
  } as never;

  try {
    await processStripeConnectV2AccountNotification({ type: "invoice.paid", related_object: { id: "in_123" } }, stripe);
    assert.equal(retrieveCalled, false);

    await processStripeConnectV2AccountNotification(
      {
        type: "v2.core.account[configuration.merchant].capability_status_updated",
        related_object: { id: "acct_v2_new" },
      },
      stripe,
    );
    assert.equal(retrieveCalled, true);
  } finally {
    prisma.firm.findFirst = originalFindFirst;
    prisma.firm.update = originalUpdate;
  }
});

test("statement descriptors and hosted invoice fields use the office name and app invoice number", () => {
  assert.deepEqual(statementDescriptorFromBusinessName("North Office"), {
    descriptor: "North Office",
    prefix: "North Offi",
  });
  const longName = statementDescriptorFromBusinessName("José Public Adjusting Office Name That Is Very Long");
  assert.equal(longName?.descriptor, "Jose Public Adjusting");
  assert.equal((longName?.descriptor.length ?? 0) <= 22, true);
  assert.equal(longName?.prefix, "Jose Publi");
  assert.equal(statementDescriptorFromBusinessName("A & B <Adjusters>")?.descriptor.includes("<"), false);
  assert.equal(statementDescriptorFromBusinessName("1234"), null);
  assert.equal(statementDescriptorFromBusinessName("Ab"), null);
  assert.equal(statementDescriptorFromBusinessName("sandbox.paclaimboard.com")?.descriptor, "sandbox paclaimboard c");

  const update = v2PublicBusinessNameUpdateParams(
    {
      display_name: "sandbox.paclaimboard.c",
      dashboard: "full",
      defaults: { profile: { doing_business_as: null }, responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
      configuration: { merchant: { statement_descriptor: { descriptor: "sandbox.paclaimboard.c", prefix: "sandbox.pa" } } },
    },
    "North Office",
  );
  assert.equal(update?.display_name, "North Office");
  assert.equal(update?.defaults?.profile?.doing_business_as, "North Office");
  assert.equal(update?.configuration?.merchant?.statement_descriptor, undefined);
  assert.equal(update?.defaults && "responsibilities" in (update.defaults ?? {}), false);

  const platformOwned = v2PublicBusinessNameUpdateParams(
    {
      display_name: "sandbox.paclaimboard.c",
      dashboard: "none",
      defaults: { profile: { doing_business_as: null }, responsibilities: { fees_collector: "application", losses_collector: "application" } },
      configuration: { merchant: { statement_descriptor: { descriptor: "sandbox.paclaimboard.c", prefix: "sandbox.pa" } } },
    },
    "North Office",
  );
  assert.equal(platformOwned?.configuration?.merchant?.statement_descriptor?.descriptor, "North Office");

  assert.equal(
    v2PublicBusinessNameUpdateParams(
      {
        display_name: "North Office",
        defaults: { profile: { doing_business_as: "North Office" } },
        configuration: { merchant: { statement_descriptor: { descriptor: "North Office", prefix: "North Offi" } } },
      },
      "North Office",
    ),
    null,
  );

  const presentation = hostedInvoicePresentation({
    invoiceNumber: "TEST-001",
    claimNumber: "CLM-1",
    insuredName: "Pat Client",
  });
  assert.equal(presentation.number, "TEST-001");
  assert.equal(presentation.description, "Client fee invoice TEST-001 · for Pat Client · claim CLM-1");
  assert.deepEqual(presentation.custom_fields, [
    { name: "Invoice #", value: "TEST-001" },
    { name: "Claim #", value: "CLM-1" },
    { name: "Insured", value: "Pat Client" },
  ]);

  const longNumber = "TEST-001-EXTRA-LONG-INVOICE-NUMBER";
  const longPresentation = hostedInvoicePresentation({ invoiceNumber: longNumber, claimNumber: null, insuredName: null });
  assert.equal(longPresentation.number, undefined);
  assert.equal(longPresentation.custom_fields[0]?.value, longNumber);
});

test("sending a payment request sets the public name and app invoice number, then resumes the same draft", async () => {
  const events: string[] = [];
  const invoiceUpdates: Array<{ externalInvoiceId?: string; externalHostedInvoiceUrl?: string }> = [];
  const originalInvoiceUpdate = prisma.invoice.update;
  const originalClaimFind = prisma.claim.findUnique;
  const originalTransaction = prisma.$transaction;
  let storedExternalId: string | null = null;

  prisma.invoice.update = (async (args: { data: { externalInvoiceId?: string; externalHostedInvoiceUrl?: string } }) => {
    invoiceUpdates.push(args.data);
    storedExternalId = args.data.externalInvoiceId ?? storedExternalId;
    events.push(args.data.externalHostedInvoiceUrl ? "invoice.persisted-sent" : "invoice.persisted-draft");
    return { id: "inv_local" };
  }) as unknown as typeof prisma.invoice.update;
  prisma.claim.findUnique = (async () => ({
    id: "claim_1",
    claimNumber: "CLM-1",
    contactId: "contact_1",
    contact: {
      id: "contact_1",
      firstName: "Pat",
      lastName: "Client",
      email: "pat@example.com",
      stripeCustomerId: "cus_123",
    },
  })) as unknown as typeof prisma.claim.findUnique;
  prisma.$transaction = (async (fn: (tx: { claim: { findUnique: () => Promise<{ id: string; contactId: string }> }; activity: { create: () => Promise<unknown> } }) => Promise<void>) =>
    fn({
      claim: { findUnique: async () => ({ id: "claim_1", contactId: "contact_1" }) },
      activity: { create: async () => ({}) },
    })) as unknown as typeof prisma.$transaction;

  const nameUpdates: Array<Record<string, unknown>> = [];
  const createdInvoices: Array<Record<string, unknown>> = [];
  const stripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async () => ({
            id: "acct_v2_new",
            display_name: "sandbox.paclaimboard.c",
            dashboard: "full",
            defaults: {
              profile: { doing_business_as: null },
              responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
            },
            configuration: { merchant: { statement_descriptor: { descriptor: "sandbox.paclaimboard.c" } } },
          }),
          update: async (_id: string, params: Record<string, unknown>) => {
            nameUpdates.push(params);
            const configuration = params.configuration as { merchant?: { statement_descriptor?: unknown } } | undefined;
            if (configuration?.merchant?.statement_descriptor) {
              throw new Stripe.errors.StripePermissionError({
                message:
                  "You do not have permission to write to configuration.merchant.statement_descriptor.descriptor. This is likely because the Account was onboarded via an Account Link or Account Session.",
                statusCode: 403,
                headers: {},
              });
            }
            events.push("v2.update-name");
            return { id: "acct_v2_new" };
          },
        },
      },
    },
    invoices: {
      create: async (params: Record<string, unknown>, options: { idempotencyKey?: string; stripeAccount?: string }) => {
        events.push("invoices.create");
        createdInvoices.push({ params, options });
        return { id: "in_stripe_1", status: "draft", number: "TEST-001", lines: { data: [] } };
      },
      retrieve: async (id: string) => {
        events.push(`invoices.retrieve:${id}`);
        if (id === "in_void") {
          return { id, status: "void", lines: { data: [] } };
        }
        return {
          id,
          status: "draft",
          number: "TEST-001",
          lines: { data: [{ description: "Client billing fee for invoice TEST-001", amount: 15000 }] },
        };
      },
      update: async (id: string, params: { number?: string }) => {
        events.push(`invoices.update:${id}:${params.number ?? ""}`);
        return { id, status: "draft", number: params.number ?? "TEST-001", lines: { data: [] } };
      },
      finalizeInvoice: async (id: string, _params: unknown, options: { idempotencyKey?: string }) => {
        events.push(`invoices.finalize:${options.idempotencyKey}`);
        return { id, status: "open", hosted_invoice_url: null };
      },
      sendInvoice: async (id: string, _params: unknown, options: { idempotencyKey?: string }) => {
        events.push(`invoices.send:${options.idempotencyKey}`);
        return {
          id,
          status: "open",
          hosted_invoice_url: "https://pay.stripe.test/in_stripe_1",
          invoice_pdf: "https://pay.stripe.test/in_stripe_1.pdf",
          amount_due: 15000,
          amount_paid: 0,
        };
      },
    },
    invoiceItems: {
      create: async (_params: unknown, options: { idempotencyKey?: string }) => {
        events.push(`invoiceItems.create:${options.idempotencyKey}`);
        return { id: "ii_1" };
      },
    },
    accounts: {
      create: async () => {
        throw new Error("v1 accounts.create must not be called");
      },
    },
  } as never;

  const localInvoice = {
    id: "inv_local",
    claimId: "claim_1",
    invoiceNumber: "TEST-001",
    feeAmountCents: 15000,
    issuedAt: new Date("2026-10-23T00:00:00Z"),
    dueAt: new Date("2026-11-06T00:00:00Z"),
    externalInvoiceId: null,
    externalHostedInvoiceUrl: null,
    sentToClientAt: null,
    status: "DRAFT",
  };

  try {
    const sent = await sendStripeConnectInvoice(
      firm({ stripeConnectAccountId: "acct_v2_new", clientPaymentFeeEnabled: false }),
      localInvoice as never,
      stripe,
    );
    assert.equal(sent.hostedInvoiceUrl, "https://pay.stripe.test/in_stripe_1");
    assert.equal(createdInvoices.length, 1);
    const created = createdInvoices[0] as {
      params: { number?: string; description?: string; custom_fields?: Array<{ name: string; value: string }> };
      options: { idempotencyKey?: string; stripeAccount?: string };
    };
    assert.equal(created.params.number, "TEST-001");
    assert.equal(created.params.description, "Client fee invoice TEST-001 · for Pat Client · claim CLM-1");
    assert.equal(created.params.custom_fields?.some((field) => field.name === "Invoice #" && field.value === "TEST-001"), true);
    assert.equal(created.params.custom_fields?.some((field) => field.name === "Claim #" && field.value === "CLM-1"), true);
    assert.equal(created.options.idempotencyKey, "client-billing-create-inv_local");
    assert.equal(created.options.stripeAccount, "acct_v2_new");
    assert.equal(
      nameUpdates.some((params) => {
        const configuration = params.configuration as { merchant?: { statement_descriptor?: unknown } } | undefined;
        return Boolean(configuration?.merchant?.statement_descriptor);
      }),
      false,
    );
    assert.equal((nameUpdates[0]?.defaults as { profile?: { doing_business_as?: string } } | undefined)?.profile?.doing_business_as, "North Office");
    assert.equal(invoiceUpdates[0]?.externalInvoiceId, "in_stripe_1");
    assert.equal(invoiceUpdates[0]?.externalHostedInvoiceUrl, undefined);
    const draftPersistedAt = events.indexOf("invoice.persisted-draft");
    const finalizedAt = events.indexOf("invoices.finalize:client-billing-finalize-inv_local");
    assert.equal(draftPersistedAt >= 0 && draftPersistedAt < finalizedAt, true);
    assert.equal(events.includes("invoices.create"), true);
    assert.equal(events.filter((event) => event === "invoices.create").length, 1);
    assert.equal(events.includes("invoices.update:in_stripe_1:"), true);
    assert.equal(events.includes("invoices.update:in_stripe_1:TEST-001"), false);

    events.length = 0;
    const resumed = await sendStripeConnectInvoice(
      firm({ stripeConnectAccountId: "acct_v2_new", clientPaymentFeeEnabled: false }),
      { ...localInvoice, externalInvoiceId: storedExternalId } as never,
      stripe,
    );
    assert.equal(resumed.invoiceId, "in_stripe_1");
    assert.equal(events.includes("invoices.create"), false);
    assert.equal(events.includes("invoices.retrieve:in_stripe_1"), true);
    assert.equal(events.includes("invoices.update:in_stripe_1:"), true);
    assert.equal(events.includes("invoices.update:in_stripe_1:TEST-001"), false);
    assert.equal(events.includes("invoiceItems.create:client-billing-item-fee-inv_local"), false);
    assert.equal(events.includes("invoices.finalize:client-billing-finalize-inv_local"), true);
    assert.equal(events.includes("invoices.send:client-billing-send-inv_local"), true);

    events.length = 0;
    await assert.rejects(
      () =>
        sendStripeConnectInvoice(
          firm({ stripeConnectAccountId: "acct_v2_new", clientPaymentFeeEnabled: false }),
          { ...localInvoice, externalInvoiceId: "in_void" } as never,
          stripe,
        ),
      /cannot be resent/,
    );
    assert.equal(events.includes("invoices.create"), false);
    assert.equal(events.includes("invoices.retrieve:in_void"), true);
  } finally {
    prisma.invoice.update = originalInvoiceUpdate;
    prisma.claim.findUnique = originalClaimFind;
    prisma.$transaction = originalTransaction;
  }
});

test("legacy connection statuses are mapped onto the firm enum", () => {
  assert.equal(coerceClientBillingConnectionStatus("PENDING"), "ONBOARDING");
  assert.equal(coerceClientBillingConnectionStatus("pending"), "ONBOARDING");
  assert.equal(coerceClientBillingConnectionStatus("ACTIVE"), "ACTIVE");
  assert.equal(coerceClientBillingConnectionStatus("not-a-status"), "RESTRICTED");
});

test("invoice payment refs prefer invoice.payments over the removed payment_intent field", () => {
  assert.deepEqual(
    paymentRefsFromInvoice({
      payments: {
        data: [
          {
            status: "open",
            payment: { type: "payment_intent", payment_intent: "pi_open" },
          },
          {
            status: "paid",
            is_default: true,
            payment: { type: "payment_intent", payment_intent: "pi_paid", charge: "ch_paid" },
          },
        ],
      },
      payment_intent: "pi_legacy",
    }),
    { paymentIntentId: "pi_paid", chargeId: "ch_paid" },
  );
});

test("v2 account sync skips statement descriptors the platform cannot write and still saves readiness", async () => {
  const updates: Array<Record<string, unknown>> = [];
  let firmUpdate: { data: Record<string, unknown> } | undefined;
  const logged: string[] = [];
  const originalFindFirst = prisma.firm.findFirst;
  const originalUpdate = prisma.firm.update;
  const originalError = console.error;
  prisma.firm.findFirst = (async () => firm({ stripeConnectAccountId: "acct_v2_new" })) as unknown as typeof prisma.firm.findFirst;
  prisma.firm.update = (async (args: { data: Record<string, unknown> }) => {
    firmUpdate = args;
    return { id: "firm_123" };
  }) as unknown as typeof prisma.firm.update;
  console.error = (...args: unknown[]) => {
    logged.push(JSON.stringify(args));
  };

  const stripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async () => ({
            id: "acct_v2_new",
            display_name: "Old Name",
            dashboard: "full",
            defaults: {
              profile: { doing_business_as: "Old Name" },
              responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
            },
            configuration: {
              merchant: {
                statement_descriptor: { descriptor: "sandbox.paclaimboard.c", prefix: "sandbox.pa" },
                capabilities: {
                  card_payments: { status: "active" },
                  stripe_balance: { payouts: { status: "active" } },
                },
              },
            },
            requirements: { entries: [] },
          }),
          update: async (_id: string, params: Record<string, unknown>) => {
            updates.push(params);
            const configuration = params.configuration as { merchant?: { statement_descriptor?: unknown } } | undefined;
            if (configuration?.merchant?.statement_descriptor) {
              throw new Stripe.errors.StripePermissionError({
                message:
                  "You do not have permission to write to configuration.merchant.statement_descriptor.descriptor. This is likely because the Account was onboarded via an Account Link or Account Session.",
                statusCode: 403,
                headers: {},
              });
            }
            return { id: "acct_v2_new" };
          },
        },
      },
    },
    accounts: {
      retrieve: async () => {
        throw new Error("v1 retrieve should not run");
      },
    },
  } as never;

  try {
    await processStripeConnectV2AccountNotification(
      {
        type: "v2.core.account[configuration.merchant].updated",
        related_object: { id: "acct_v2_new" },
      },
      stripe,
    );
  } finally {
    prisma.firm.findFirst = originalFindFirst;
    prisma.firm.update = originalUpdate;
    console.error = originalError;
  }

  assert.equal(firmUpdate?.data.stripeChargesEnabled, true);
  assert.equal(firmUpdate?.data.stripePayoutsEnabled, true);
  assert.equal(firmUpdate?.data.stripeDetailsSubmitted, true);
  assert.equal(firmUpdate?.data.clientBillingEnabled, true);
  assert.equal(firmUpdate?.data.clientBillingConnectionStatus, "ACTIVE");
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.display_name, "North Office");
  const configuration = updates[0]?.configuration as { merchant?: { statement_descriptor?: unknown } } | undefined;
  assert.equal(configuration?.merchant?.statement_descriptor, undefined);
  assert.equal(logged.some((line) => line.includes("Could not update the connected account statement descriptor.")), false);
});

test("a statement descriptor permission error does not fail account sync", async () => {
  let firmUpdate: { data: Record<string, unknown> } | undefined;
  const updates: Array<Record<string, unknown>> = [];
  const logged: string[] = [];
  const originalFindFirst = prisma.firm.findFirst;
  const originalUpdate = prisma.firm.update;
  const originalError = console.error;
  prisma.firm.findFirst = (async () => firm({ stripeConnectAccountId: "acct_platform" })) as unknown as typeof prisma.firm.findFirst;
  prisma.firm.update = (async (args: { data: Record<string, unknown> }) => {
    firmUpdate = args;
    return { id: "firm_123" };
  }) as unknown as typeof prisma.firm.update;
  console.error = (...args: unknown[]) => {
    logged.push(JSON.stringify(args));
  };

  const stripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async () => ({
            id: "acct_platform",
            display_name: "Old Name",
            dashboard: "none",
            defaults: {
              profile: { doing_business_as: "Old Name" },
              responsibilities: { fees_collector: "application", losses_collector: "application" },
            },
            configuration: {
              merchant: {
                statement_descriptor: { descriptor: "sandbox.paclaimboard.c" },
                capabilities: {
                  card_payments: { status: "pending" },
                  stripe_balance: { payouts: { status: "pending" } },
                },
              },
            },
            requirements: {
              entries: [{ awaiting_action_from: "user", minimum_deadline: { status: "currently_due" } }],
            },
          }),
          update: async (_id: string, params: Record<string, unknown>) => {
            updates.push(params);
            const configuration = params.configuration as { merchant?: { statement_descriptor?: unknown } } | undefined;
            if (configuration?.merchant?.statement_descriptor) {
              throw new Stripe.errors.StripePermissionError({
                message:
                  "You do not have permission to write to configuration.merchant.statement_descriptor.descriptor. This is likely because the Account was onboarded via an Account Link or Account Session.",
                statusCode: 403,
                headers: {},
              });
            }
            return { id: "acct_platform" };
          },
        },
      },
    },
  } as never;

  try {
    await processStripeConnectV2AccountNotification(
      { type: "v2.core.account.updated", related_object: { id: "acct_platform" } },
      stripe,
    );
  } finally {
    prisma.firm.findFirst = originalFindFirst;
    prisma.firm.update = originalUpdate;
    console.error = originalError;
  }

  assert.equal(firmUpdate?.data.clientBillingConnectionStatus, "RESTRICTED");
  assert.equal(firmUpdate?.data.clientBillingEnabled, false);
  assert.equal(firmUpdate?.data.stripeChargesEnabled, false);
  assert.equal(updates.length, 2);
  assert.equal(
    (updates[1]?.defaults as { profile?: { doing_business_as?: string } } | undefined)?.profile?.doing_business_as,
    "North Office",
  );
  assert.equal("configuration" in (updates[1] ?? {}), false);
  assert.equal(logged.some((line) => line.includes("Could not update the connected account statement descriptor.")), false);
});
