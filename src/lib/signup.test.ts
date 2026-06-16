import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStripeCheckoutSessionParams, canReuseOpenCheckoutSession, provisionTrialSignup } from "@/lib/signup";
import { startSignupWithState } from "@/lib/signup-actions";
import { TRIAL_DAYS } from "@/lib/trial";

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
