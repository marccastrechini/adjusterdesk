import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { TrialBanner } from "@/components/trial-banner";

test("comfortable trial state renders a low-key banner", () => {
  const html = renderToStaticMarkup(
    <TrialBanner
      firm={{
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      }}
    />,
  );

  assert.match(html, /Free trial:/);
  assert.match(html, /No credit card required/);
  assert.match(html, /Billing/);
});

test("active subscription renders no trial banner", () => {
  const html = renderToStaticMarkup(
    <TrialBanner
      firm={{
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      }}
    />,
  );

  assert.equal(html, "");
});

test("imminent trial state renders urgent message with billing call to action", () => {
  const html = renderToStaticMarkup(
    <TrialBanner
      firm={{
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      }}
    />,
  );

  assert.match(html, /ends in 1 day/i);
  assert.match(html, /Choose a plan/i);
  assert.match(html, /\/settings\/billing/);
});

test("expired trial state renders billing call to action", () => {
  const html = renderToStaticMarkup(
    <TrialBanner
      firm={{
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }}
    />,
  );

  assert.match(html, /free trial has ended/i);
  assert.match(html, /Choose a plan/i);
  assert.match(html, /\/settings\/billing/);
});
