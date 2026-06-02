import assert from "node:assert/strict";
import { test } from "node:test";
import { canReuseOpenCheckoutSession } from "@/lib/signup";

test("checkout session reuse helper only accepts open sessions with URL", () => {
  assert.equal(canReuseOpenCheckoutSession({ status: "open", url: "https://checkout.stripe.test/session" }), true);
  assert.equal(canReuseOpenCheckoutSession({ status: "complete", url: "https://checkout.stripe.test/session" }), false);
  assert.equal(canReuseOpenCheckoutSession({ status: "open", url: null }), false);
  assert.equal(canReuseOpenCheckoutSession(undefined), false);
});
