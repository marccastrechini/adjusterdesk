import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  clientBillingReadinessFromV1Account,
  clientBillingReadinessFromV2Account,
  clientBillingStripeErrorLogFields,
  isLegacyExpressConnectedAccount,
  logClientBillingStripeError,
  merchantAccountCreateParams,
  v2OnboardingLinkParams,
} from "@/lib/client-billing/stripe-connect-account";
import {
  createOrResumeStripeConnectAccount,
  processStripeConnectV2AccountNotification,
  refreshStripeConnectAccount,
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
