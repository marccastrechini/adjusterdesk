import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FOUNDING_HONESTY_NOTE,
  FOUNDING_PRICE_LINE,
  FOUNDING_SMALL_OFFICE_SIGNUP_HREF,
  FOUNDING_SOLO_SIGNUP_HREF,
  isFoundingOffer,
  resolveSignupSource,
} from "@/lib/founding-offer";

test("founding terms stay in plain dollars", () => {
  assert.match(FOUNDING_PRICE_LINE, /\$0 for 90 days/);
  assert.match(FOUNDING_PRICE_LINE, /\$29\/month Solo/);
  assert.match(FOUNDING_PRICE_LINE, /\$49\/month Small Office/);
  assert.match(FOUNDING_PRICE_LINE, /locked for 12 months/);
  assert.match(FOUNDING_HONESTY_NOTE, /collects a card at signup/);
  assert.match(FOUNDING_HONESTY_NOTE, /\$0 is due during the 14-day trial/);
  assert.match(FOUNDING_HONESTY_NOTE, /not in Stripe yet/);
  assert.doesNotMatch(FOUNDING_HONESTY_NOTE, /no card/i);
});

test("founding signup links tag solo and small office", () => {
  assert.equal(FOUNDING_SOLO_SIGNUP_HREF, "/signup?plan=solo&offer=founding");
  assert.equal(FOUNDING_SMALL_OFFICE_SIGNUP_HREF, "/signup?plan=small-office&offer=founding");
});

test("founding offer tag maps to a signup source", () => {
  assert.equal(isFoundingOffer("founding"), true);
  assert.equal(isFoundingOffer(" Founding "), true);
  assert.equal(isFoundingOffer("solo"), false);
  assert.equal(isFoundingOffer(null), false);
  assert.equal(resolveSignupSource("founding"), "founding");
  assert.equal(resolveSignupSource("other"), "public-signup");
  assert.equal(resolveSignupSource(undefined), "public-signup");
});
