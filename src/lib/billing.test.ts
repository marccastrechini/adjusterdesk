import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { SubscriptionStatus } from "@/generated/prisma/client";
import {
  findPublicPlanBySlug,
  mapStripeSubscriptionStatus,
  publicSelfServiceReady,
  resolvePublicStartHref,
  resolvePublicStartLabel,
  stripeConfigured,
} from "@/lib/billing";

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
  assert.equal(resolvePublicStartLabel(), "Start using AdjusterDesk");
});

test("stripe provider requires complete stripe config", () => {
  process.env.SELF_SERVICE_SIGNUP_ENABLED = "true";
  process.env.BILLING_PROVIDER = "stripe";
  process.env.STRIPE_SECRET_KEY = "sk_test_123";

  assert.equal(stripeConfigured(), false);
  assert.equal(publicSelfServiceReady(), false);
  assert.equal(resolvePublicStartHref("team"), "/signup?plan=team");
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
  assert.equal(resolvePublicStartLabel("small-office"), "Start Small Office");
});

test("stripe subscription status maps to internal status", () => {
  assert.equal(mapStripeSubscriptionStatus("trialing"), SubscriptionStatus.TRIAL);
  assert.equal(mapStripeSubscriptionStatus("active"), SubscriptionStatus.ACTIVE);
  assert.equal(mapStripeSubscriptionStatus("past_due"), SubscriptionStatus.PAST_DUE);
  assert.equal(mapStripeSubscriptionStatus("canceled"), SubscriptionStatus.CANCELED);
  assert.equal(mapStripeSubscriptionStatus("unknown"), SubscriptionStatus.MANUAL);
});
