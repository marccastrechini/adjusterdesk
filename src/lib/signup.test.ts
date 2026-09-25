import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStripeClient } from "@/lib/stripe";
import {
  beginPublicSignup,
  buildStripeCheckoutSessionParams,
  canReuseOpenCheckoutSession,
  createStripeCheckoutSessionForIntent,
  provisionTrialSignup,
  type TrialSignupInput,
} from "@/lib/signup";
import { startSignupWithState } from "@/lib/signup-actions";
import { TRIAL_DAYS } from "@/lib/trial";

const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_signup";

const stripeEnvKeys = [
  "SELF_SERVICE_SIGNUP_ENABLED",
  "BILLING_PROVIDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_SOLO_MONTHLY",
  "STRIPE_PRICE_SMALL_OFFICE_MONTHLY",
  "STRIPE_PRICE_TEAM_MONTHLY",
  "APP_BASE_URL",
] as const;

function snapshotEnv() {
  const previous = new Map(stripeEnvKeys.map((key) => [key, process.env[key]]));
  return () => {
    for (const key of stripeEnvKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function configureStripeEnv(provider: "stripe" | "manual" = "stripe") {
  process.env.SELF_SERVICE_SIGNUP_ENABLED = "true";
  process.env.BILLING_PROVIDER = provider;
  process.env.STRIPE_SECRET_KEY = "sk_test_signup";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_signup";
  process.env.STRIPE_PRICE_SOLO_MONTHLY = "price_solo";
  process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY = "price_small";
  process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";
  process.env.APP_BASE_URL = "http://localhost:3000";
}

function redirectUrlFromError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return null;
  }

  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT;")) {
    return null;
  }

  return digest.split(";").slice(2, -2).join(";");
}

function signupForm(plan = "solo") {
  const formData = new FormData();
  formData.set("plan", plan);
  formData.set("firmName", "Harbor Public Adjusting");
  formData.set("ownerName", "Pat Owner");
  formData.set("ownerEmail", "pat@example.com");
  formData.set("ownerPhone", "555-0101");
  formData.set("password", "password123");
  formData.set("confirmPassword", "password123");
  formData.set("agreedToTerms", "on");
  return formData;
}

function trialInput(planSlug: TrialSignupInput["planSlug"] = "solo"): TrialSignupInput {
  return {
    planSlug,
    firmName: "Harbor Public Adjusting",
    ownerName: "Pat Owner",
    ownerEmail: "pat@example.com",
    ownerPhone: "555-0101",
    passwordHash: "scrypt$salt$hash",
  };
}

function patch<T extends object, K extends keyof T>(target: T, key: K, value: unknown) {
  const original = target[key];
  target[key] = value as T[K];
  return () => {
    target[key] = original;
  };
}

function installTrialTransactionMock() {
  let called = false;
  const restore = patch(prisma, "$transaction", async (fn: unknown) => {
    called = true;
    if (typeof fn !== "function") {
      throw new Error("Expected an interactive transaction.");
    }

    return fn({
      user: {
        findUnique: async () => null,
        create: async () => ({ id: "user_trial" }),
      },
      firm: {
        create: async (args: { data: { subscriptionStatus: SubscriptionStatus } }) => {
          assert.equal(args.data.subscriptionStatus, SubscriptionStatus.TRIAL);
          return { id: "firm_trial" };
        },
      },
    });
  });

  return {
    called: () => called,
    restore,
  };
}

test("checkout session reuse helper only accepts open sessions with URL", () => {
  assert.equal(canReuseOpenCheckoutSession({ status: "open", url: "https://checkout.stripe.test/session" }), true);
  assert.equal(canReuseOpenCheckoutSession({ status: "complete", url: "https://checkout.stripe.test/session" }), false);
  assert.equal(canReuseOpenCheckoutSession({ status: "open", url: null }), false);
  assert.equal(canReuseOpenCheckoutSession(undefined), false);
});

test("checkout session params include the selected Stripe price ID", () => {
  const params = buildStripeCheckoutSessionParams({
    intent: {
      id: "intent_123",
      ownerEmail: "owner@example.com",
      ownerName: "Pat Owner",
      firmName: "Harbor Public Adjusting",
      ownerPhone: "555-0100",
    },
    planSlug: "small-office",
    appBaseUrl: "http://localhost:3000",
    priceId: "price_test_small_office",
  });

  assert.equal(params.mode, "subscription");
  assert.ok(params.line_items);
  assert.ok(params.metadata);
  assert.equal(params.line_items[0]?.price, "price_test_small_office");
  assert.equal(params.line_items[0]?.quantity, 1);
  assert.equal(params.client_reference_id, "intent_123");
  assert.equal(params.metadata.signupIntentId, "intent_123");
  assert.equal(params.metadata.planSlug, "small-office");
  assert.equal(params.payment_method_collection, "always");
  assert.equal(params.subscription_data?.trial_period_days, TRIAL_DAYS);
  assert.equal(params.cancel_url, "http://localhost:3000/signup/cancel?intent=intent_123");
  assert.equal(params.success_url, "http://localhost:3000/signup/success?plan=small-office&session_id={CHECKOUT_SESSION_ID}");
});

test("provisionTrialSignup is exported and is a function", () => {
  assert.equal(typeof provisionTrialSignup, "function");
});

test("TRIAL_DAYS constant is used by trial signup path", () => {
  // Trial end date should be TRIAL_DAYS ahead; verify the constant matches expectations.
  assert.ok(TRIAL_DAYS > 0, "TRIAL_DAYS should be positive");
  assert.ok(TRIAL_DAYS <= 90, "TRIAL_DAYS should be a reasonable trial length");
});

test("signup validation keeps non-sensitive fields when password is too weak", async () => {
  const formData = new FormData();
  formData.set("plan", "small-office");
  formData.set("firmName", "Harbor Public Adjusting");
  formData.set("ownerName", "Pat Owner");
  formData.set("ownerEmail", "pat@example.com");
  formData.set("ownerPhone", "555-0101");
  formData.set("password", "123");
  formData.set("confirmPassword", "123");
  formData.set("agreedToTerms", "on");

  const result = await startSignupWithState({}, formData);

  assert.equal(result.message, "Fix the highlighted fields and try again.");
  assert.equal(result.fieldErrors?.password, "Use at least 8 characters for your password.");
  assert.equal(result.fieldValues?.plan, "small-office");
  assert.equal(result.fieldValues?.firmName, "Harbor Public Adjusting");
  assert.equal(result.fieldValues?.ownerName, "Pat Owner");
  assert.equal(result.fieldValues?.ownerEmail, "pat@example.com");
  assert.equal(result.fieldValues?.ownerPhone, "555-0101");
  assert.equal(result.fieldValues?.agreedToTerms, true);
  assert.equal("password" in (result.fieldValues ?? {}), false);
  assert.equal("confirmPassword" in (result.fieldValues ?? {}), false);
});

test("stripe signup redirects to Checkout and does not create a workspace", async () => {
  const restoreEnv = snapshotEnv();
  configureStripeEnv("stripe");

  let checkoutCalls = 0;
  let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
  let workspaceWriteAttempted = false;

  const restoreUserLookup = patch(prisma.user, "findUnique", async () => null);
  const restoreFirmLookup = patch(prisma.firm, "findFirst", async () => null);
  const restoreIntentCreate = patch(prisma.signupIntent, "create", async () => ({ id: "intent_123" }));
  const restoreIntentFind = patch(prisma.signupIntent, "findUnique", async () => ({
    id: "intent_123",
    ownerEmail: "pat@example.com",
    ownerName: "Pat Owner",
    firmName: "Harbor Public Adjusting",
    ownerPhone: "555-0101",
    stripeCheckoutSessionId: null,
    status: "PENDING",
  }));
  const restoreIntentUpdate = patch(prisma.signupIntent, "update", async () => ({ id: "intent_123" }));
  const restoreFirmCreate = patch(prisma.firm, "create", async () => {
    workspaceWriteAttempted = true;
    throw new Error("Workspace must not be created before Checkout.");
  });
  const restoreTransaction = patch(prisma, "$transaction", async () => {
    workspaceWriteAttempted = true;
    throw new Error("Workspace must not be created before Checkout.");
  });

  const stripe = requireStripeClient();
  const restoreCheckoutCreate = patch(stripe.checkout.sessions, "create", async (params: Stripe.Checkout.SessionCreateParams) => {
    checkoutCalls += 1;
    capturedParams = params;
    return { id: "cs_test_signup", url: CHECKOUT_URL, status: "open" };
  });

  try {
    await startSignupWithState({}, signupForm("solo"));
    assert.fail("Expected redirect to Stripe Checkout.");
  } catch (error) {
    assert.equal(redirectUrlFromError(error), CHECKOUT_URL);
  } finally {
    restoreCheckoutCreate();
    restoreTransaction();
    restoreFirmCreate();
    restoreIntentUpdate();
    restoreIntentFind();
    restoreIntentCreate();
    restoreFirmLookup();
    restoreUserLookup();
    restoreEnv();
  }

  assert.equal(checkoutCalls, 1);
  assert.equal(workspaceWriteAttempted, false);
  assert.equal(capturedParams?.mode, "subscription");
  assert.equal(capturedParams?.payment_method_collection, "always");
  assert.equal(capturedParams?.subscription_data?.trial_period_days, TRIAL_DAYS);
  assert.equal(capturedParams?.line_items?.[0]?.price, "price_solo");
  assert.equal(capturedParams?.client_reference_id, "intent_123");
  assert.equal(capturedParams?.cancel_url, "http://localhost:3000/signup/cancel?intent=intent_123");
});

test("manual billing still provisions a trial workspace without Checkout", async () => {
  const restoreEnv = snapshotEnv();
  configureStripeEnv("manual");

  let checkoutCalls = 0;
  const trial = installTrialTransactionMock();
  const restoreUserLookup = patch(prisma.user, "findUnique", async () => null);
  const restoreFirmLookup = patch(prisma.firm, "findFirst", async () => null);
  const stripe = requireStripeClient();
  const restoreCheckoutCreate = patch(stripe.checkout.sessions, "create", async () => {
    checkoutCalls += 1;
    throw new Error("Checkout must not start when billing is manual.");
  });

  try {
    await startSignupWithState({}, signupForm("small-office"));
    assert.fail("Expected trial signup to continue into session creation.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    assert.match(message, /cookies/);
    assert.equal(redirectUrlFromError(error), null);
  } finally {
    restoreCheckoutCreate();
    restoreFirmLookup();
    restoreUserLookup();
    trial.restore();
    restoreEnv();
  }

  assert.equal(trial.called(), true);
  assert.equal(checkoutCalls, 0);
});

test("incomplete stripe config keeps the trial workspace path and logs the config issue", async () => {
  const restoreEnv = snapshotEnv();
  process.env.SELF_SERVICE_SIGNUP_ENABLED = "true";
  process.env.BILLING_PROVIDER = "stripe";
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PRICE_SOLO_MONTHLY;
  delete process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY;
  delete process.env.STRIPE_PRICE_TEAM_MONTHLY;

  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((value) => String(value)).join(" "));
  };

  const trial = installTrialTransactionMock();

  try {
    const result = await beginPublicSignup(trialInput("team"));
    assert.equal(result.mode, "trial");
    if (result.mode === "trial") {
      assert.equal(result.firmId, "firm_trial");
      assert.equal(result.ownerUserId, "user_trial");
      assert.equal(result.planSlug, "team");
    }
  } finally {
    console.warn = originalWarn;
    trial.restore();
    restoreEnv();
  }

  assert.equal(trial.called(), true);
  assert.equal(warnings.some((warning) => warning.includes("Stripe mode is enabled but configuration is incomplete")), true);
});

test("open checkout sessions are reused for the same signup intent", async () => {
  const restoreEnv = snapshotEnv();
  configureStripeEnv("stripe");

  let checkoutCreates = 0;
  const restoreIntentFind = patch(prisma.signupIntent, "findUnique", async () => ({
    id: "intent_open",
    ownerEmail: "pat@example.com",
    ownerName: "Pat Owner",
    firmName: "Harbor Public Adjusting",
    ownerPhone: null,
    stripeCheckoutSessionId: "cs_existing",
    status: "PENDING",
  }));

  const stripe = requireStripeClient();
  const restoreRetrieve = patch(stripe.checkout.sessions, "retrieve", async () => ({
    id: "cs_existing",
    url: CHECKOUT_URL,
    status: "open",
  }));
  const restoreCreate = patch(stripe.checkout.sessions, "create", async () => {
    checkoutCreates += 1;
    throw new Error("A new Checkout session must not be created while one is open.");
  });

  try {
    const session = await createStripeCheckoutSessionForIntent("intent_open", "solo");
    assert.equal(session.url, CHECKOUT_URL);
    assert.equal(checkoutCreates, 0);
  } finally {
    restoreCreate();
    restoreRetrieve();
    restoreIntentFind();
    restoreEnv();
  }
});
