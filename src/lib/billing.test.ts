import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { SubscriptionStatus } from "@/generated/prisma/client";
import {
  findPublicPlanBySlug,
  getStripeConfigDiagnostics,
  isPlanSlug,
  mapStripeSubscriptionStatus,
  parsePlanSlug,
  publicSelfServiceReady,
  resolvePublicStartHref,
  resolvePublicStartLabel,
  resolveStripePriceId,
  stripeConfigured,
} from "@/lib/billing";
import { requireStripeWebhookSecret } from "@/lib/stripe";

afterEach(() => {
  delete process.env.SELF_SERVICE_SIGNUP_ENABLED;
  delete process.env.BILLING_PROVIDER;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PRICE_SOLO_MONTHLY;
  delete process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY;
  delete process.env.STRIPE_PRICE_TEAM_MONTHLY;
});

test("public plan slugs map to plan and user limits", () => {
  const solo = findPublicPlanBySlug("solo");
  const smallOffice = findPublicPlanBySlug("small-office");
  const team = findPublicPlanBySlug("team");

  assert.ok(solo);
  assert.equal(solo.includedUserLimit, 1);
  assert.ok(smallOffice);
  assert.equal(smallOffice.includedUserLimit, 3);
  assert.ok(team);
  assert.equal(team.includedUserLimit, 7);
});

test("public start link remains signup when feature flag is off", () => {
  process.env.SELF_SERVICE_SIGNUP_ENABLED = "false";

  assert.equal(publicSelfServiceReady(), false);
  assert.equal(resolvePublicStartHref("solo"), "/signup?plan=solo");
  assert.equal(resolvePublicStartLabel(), "Start free trial");
});

test("stripe provider requires complete stripe config", () => {
  process.env.SELF_SERVICE_SIGNUP_ENABLED = "true";
  process.env.BILLING_PROVIDER = "stripe";
  process.env.STRIPE_SECRET_KEY = "sk_test_123";

  assert.equal(stripeConfigured(), false);
  assert.equal(publicSelfServiceReady(), true);
  assert.equal(resolvePublicStartHref("team"), "/signup?plan=team");

  const diagnostics = getStripeConfigDiagnostics();
  assert.equal(diagnostics.ready, false);
  assert.deepEqual(diagnostics.missingVars, [
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_SOLO_MONTHLY",
    "STRIPE_PRICE_SMALL_OFFICE_MONTHLY",
    "STRIPE_PRICE_TEAM_MONTHLY",
  ]);
});

test("stripe provider becomes ready when all stripe vars are set", () => {
  process.env.SELF_SERVICE_SIGNUP_ENABLED = "true";
  process.env.BILLING_PROVIDER = "stripe";
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
  process.env.STRIPE_PRICE_SOLO_MONTHLY = "price_solo";
  process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY = "price_small";
  process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";

  assert.equal(stripeConfigured(), true);
  assert.equal(publicSelfServiceReady(), true);
  assert.equal(resolvePublicStartHref("small-office"), "/signup?plan=small-office");
  assert.equal(resolvePublicStartLabel("small-office"), "Start Small Office free trial");

  const diagnostics = getStripeConfigDiagnostics();
  assert.equal(diagnostics.ready, true);
  assert.deepEqual(diagnostics.missingVars, []);
});

test("stripe price IDs map to solo, small office, and team", () => {
  process.env.STRIPE_PRICE_SOLO_MONTHLY = "price_solo";
  process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY = "price_small";
  process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team";

  assert.equal(resolveStripePriceId("solo"), "price_solo");
  assert.equal(resolveStripePriceId("small-office"), "price_small");
  assert.equal(resolveStripePriceId("team"), "price_team");
});

test("stripe price mapping falls back to empty string when missing", () => {
  assert.equal(resolveStripePriceId("solo"), null);
  assert.equal(resolveStripePriceId("small-office"), null);
  assert.equal(resolveStripePriceId("team"), null);
});

test("plan slug helpers validate and parse only allowed values", () => {
  assert.equal(isPlanSlug("solo"), true);
  assert.equal(isPlanSlug("small-office"), true);
  assert.equal(isPlanSlug("team"), true);
  assert.equal(isPlanSlug("enterprise"), false);
  assert.equal(isPlanSlug(undefined), false);

  assert.equal(parsePlanSlug("solo"), "solo");
  assert.equal(parsePlanSlug("small-office"), "small-office");
  assert.equal(parsePlanSlug("team"), "team");
  assert.equal(parsePlanSlug("TEAM"), "team");
  assert.equal(parsePlanSlug("invalid"), null);
  assert.equal(parsePlanSlug(""), null);
});

test("stripe subscription status maps to internal status", () => {
  assert.equal(mapStripeSubscriptionStatus("trialing"), SubscriptionStatus.TRIAL);
  assert.equal(mapStripeSubscriptionStatus("active"), SubscriptionStatus.ACTIVE);
  assert.equal(mapStripeSubscriptionStatus("past_due"), SubscriptionStatus.PAST_DUE);
  assert.equal(mapStripeSubscriptionStatus("canceled"), SubscriptionStatus.CANCELED);
  assert.equal(mapStripeSubscriptionStatus("unknown"), SubscriptionStatus.MANUAL);
});

test("webhook secret helper requires STRIPE_WEBHOOK_SECRET", () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.throws(() => requireStripeWebhookSecret(), /webhook secret is not configured/i);

  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_value";
  assert.equal(requireStripeWebhookSecret(), "whsec_test_value");
});
