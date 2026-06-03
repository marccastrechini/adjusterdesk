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
