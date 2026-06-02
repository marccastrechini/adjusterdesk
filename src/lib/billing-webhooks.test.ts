import assert from "node:assert/strict";
import { test } from "node:test";
import { isIgnorableSignupCompletionError } from "@/lib/billing-webhooks";

test("webhook signup completion ignores expected idempotency and timing errors", () => {
  assert.equal(isIgnorableSignupCompletionError(new Error("Signup request is already being processed.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Checkout is not complete yet.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Checkout payment is not complete yet.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Subscription was not created.")), true);
  assert.equal(isIgnorableSignupCompletionError(new Error("Some other failure")), false);
  assert.equal(isIgnorableSignupCompletionError("not-an-error"), false);
});
