import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsBootstrapScript, gaMeasurementId, trackAnalyticsEvent, trackConversionEvent } from "@/lib/analytics";

const measurementId = "G-QM2L44CMB2";

function installWindow(hostname: string, withGtag = true) {
  const calls: unknown[][] = [];
  const dataLayer: unknown[] = [];
  const gtag = (...args: unknown[]) => {
    calls.push(args);
    dataLayer.push(args);
  };
  const windowValue = {
    location: { hostname },
    dataLayer,
    gtag: withGtag ? gtag : undefined,
  };
  Object.assign(globalThis, { window: windowValue });
  return {
    calls,
    dataLayer,
    windowValue,
    restore() {
      delete (globalThis as { window?: unknown }).window;
    },
  };
}

test("bootstrap script assigns window.gtag before the library loads", () => {
  const script = analyticsBootstrapScript(measurementId);
  assert.match(script, /window\.gtag=window\.gtag\|\|function\(\)/);
  assert.match(script, new RegExp(measurementId));
  assert.throws(() => analyticsBootstrapScript("not-an-id"));
});

test("key events call gtag on the production host and drop email or name params", () => {
  const previous = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = measurementId;
  const { calls, restore } = installWindow("paclaimboard.com");

  try {
    const sent = trackConversionEvent("sign_up", {
      source: "public-signup",
      method: "checkout",
      plan: "solo",
      email: "owner@example.com",
      name: "Owner",
      note: "owner@example.com",
    });

    assert.equal(sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.[0], "event");
    assert.equal(calls[0]?.[1], "sign_up");
    const params = calls[0]?.[2] as Record<string, unknown>;
    assert.equal(params.plan, "solo");
    assert.equal(params.method, "checkout");
    assert.equal("email" in params, false);
    assert.equal("name" in params, false);
    assert.equal("note" in params, false);
    assert.equal(gaMeasurementId(), measurementId);
  } finally {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previous;
    restore();
  }
});

test("key events do not fire on sandbox or without a measurement id", () => {
  const previous = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = measurementId;
  const sandbox = installWindow("sandbox.paclaimboard.com");

  try {
    assert.equal(trackAnalyticsEvent("trial_start_click", { href: "/signup" }), false);
    assert.equal(sandbox.calls.length, 0);
    sandbox.restore();

    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "";
    const production = installWindow("www.paclaimboard.com");
    assert.equal(trackAnalyticsEvent("claim_tracker_download", { href: "/downloads/public-adjuster-claim-tracker.csv" }), false);
    assert.equal(production.calls.length, 0);
    production.restore();
  } finally {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previous;
    delete (globalThis as { window?: unknown }).window;
  }
});

test("a missing gtag function is queued on the dataLayer for production", () => {
  const previous = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = measurementId;
  const { dataLayer, windowValue, restore } = installWindow("paclaimboard.com", false);

  try {
    assert.equal(trackAnalyticsEvent("purchase", { currency: "USD", value: 49, plan: "solo" }), true);
    assert.equal(typeof windowValue.gtag, "function");
    assert.equal(dataLayer.length, 1);
  } finally {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previous;
    restore();
  }
});
