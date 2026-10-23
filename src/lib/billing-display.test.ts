import assert from "node:assert/strict";
import { test } from "node:test";
import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { verifySignedSessionValue } from "@/lib/auth";
import {
  billingStartPlanOptions,
  checkoutFactsFromStripeSession,
  decideSignupSuccessNavigation,
  describeWorkspaceBilling,
  signupOfficeEnterHref,
  signupSuccessCopy,
  signupWelcomeMessage,
} from "@/lib/billing-display";
import { formatDate } from "@/lib/format";
import { rethrowIfNavigationError } from "@/lib/navigation-errors";
import { buildOwnerSessionCookie } from "@/lib/session";

const priceEnvKeys = ["STRIPE_PRICE_SOLO_MONTHLY", "STRIPE_PRICE_FOUNDING_SOLO_MONTHLY", "STRIPE_PRICE_SMALL_OFFICE_MONTHLY", "STRIPE_PRICE_FOUNDING_SMALL_OFFICE_MONTHLY"] as const;

function withPriceEnv(values: Partial<Record<(typeof priceEnvKeys)[number], string>>, run: () => void) {
  const previous = new Map(priceEnvKeys.map((key) => [key, process.env[key]]));
  for (const key of priceEnvKeys) {
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const key of priceEnvKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("founding trial with a Stripe subscription shows the founding price and hides start subscription", () => {
  withPriceEnv(
    {
      STRIPE_PRICE_SOLO_MONTHLY: "price_standard_solo",
      STRIPE_PRICE_FOUNDING_SOLO_MONTHLY: "price_founding_solo",
    },
    () => {
      const trialEndsAt = new Date("2027-01-21T15:00:00.000Z");
      const view = describeWorkspaceBilling({
        subscriptionPlan: SubscriptionPlan.SOLO,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        signupSource: "founding",
        billingSubscriptionId: "sub_founding",
        billingPriceId: "price_founding_solo",
        trialEndsAt,
      });

      assert.equal(view.statusLabel, "Trialing");
      assert.equal(view.offerLabel, "Founding");
      assert.equal(view.monthlyPriceLabel, "$29/month");
      assert.equal(view.detail, `Trialing until ${formatDate(trialEndsAt)}, then $29/month.`);
      assert.equal(view.hasSubscription, true);
      assert.equal(view.showStartSubscription, false);
      assert.equal(view.showPendingActivationNote, false);
      assert.match(signupWelcomeMessage({
        subscriptionPlan: SubscriptionPlan.SOLO,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        signupSource: "founding",
        billingSubscriptionId: "sub_founding",
        billingPriceId: "price_founding_solo",
        trialEndsAt,
      }), /then \$29\/month/);
      assert.doesNotMatch(signupWelcomeMessage({
        subscriptionPlan: SubscriptionPlan.SOLO,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        signupSource: "founding",
        billingSubscriptionId: "sub_founding",
        billingPriceId: "price_founding_solo",
        trialEndsAt,
      }), /14-day/);
    },
  );
});

test("a founding signup charged the standard price shows the standard rate", () => {
  withPriceEnv(
    {
      STRIPE_PRICE_SOLO_MONTHLY: "price_standard_solo",
      STRIPE_PRICE_FOUNDING_SOLO_MONTHLY: "price_founding_solo",
    },
    () => {
      const view = describeWorkspaceBilling({
        subscriptionPlan: SubscriptionPlan.SOLO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        signupSource: "founding",
        billingSubscriptionId: "sub_standard",
        billingPriceId: "price_standard_solo",
      });

      assert.equal(view.offerLabel, "Standard");
      assert.equal(view.monthlyPriceLabel, "$49/month");
      assert.equal(view.statusLabel, "Active");
      assert.equal(view.detail, "Active at $49/month.");
      assert.equal(view.showStartSubscription, false);
    },
  );
});

test("trial without a subscription can start on founding prices", () => {
  const view = describeWorkspaceBilling({
    subscriptionPlan: SubscriptionPlan.SMALL_OFFICE,
    subscriptionStatus: SubscriptionStatus.TRIAL,
    signupSource: "founding",
    billingSubscriptionId: null,
    trialEndsAt: new Date("2026-11-06T15:00:00.000Z"),
  });
  const plans = billingStartPlanOptions(view.offerLabel === "Founding");

  assert.equal(view.showStartSubscription, true);
  assert.equal(view.showPendingActivationNote, true);
  assert.equal(view.statusLabel, "Trial");
  assert.deepEqual(
    plans.map((plan) => [plan.slug, plan.label, plan.priceLabel]),
    [
      ["solo", "Founding Solo", "$29/month"],
      ["small-office", "Founding Small Office", "$49/month"],
      ["team", "Team", "$199/month"],
    ],
  );
});

test("past due and canceled subscriptions use their real status", () => {
  const pastDue = describeWorkspaceBilling({
    subscriptionPlan: SubscriptionPlan.SOLO,
    subscriptionStatus: SubscriptionStatus.PAST_DUE,
    signupSource: "public-signup",
    billingSubscriptionId: "sub_past_due",
  });
  const canceled = describeWorkspaceBilling({
    subscriptionPlan: SubscriptionPlan.SOLO,
    subscriptionStatus: SubscriptionStatus.CANCELED,
    signupSource: "public-signup",
    billingSubscriptionId: "sub_canceled",
  });

  assert.equal(pastDue.statusLabel, "Past due");
  assert.match(pastDue.detail ?? "", /Past due/);
  assert.equal(pastDue.showStartSubscription, false);
  assert.equal(canceled.statusLabel, "Canceled");
  assert.equal(canceled.showStartSubscription, true);
});

test("completed founding checkout copy uses the session trial and first charge", () => {
  withPriceEnv({ STRIPE_PRICE_FOUNDING_SOLO_MONTHLY: "price_founding_solo" }, () => {
    const trialStart = new Date("2026-10-23T00:00:00.000Z");
    const trialEnd = new Date(trialStart.getTime() + 90 * 86_400_000);
    const facts = checkoutFactsFromStripeSession(
      {
        status: "complete",
        payment_status: "no_payment_required",
        metadata: { planSlug: "solo", signupSource: "founding" },
        subscription: {
          status: "trialing",
          trial_start: Math.floor(trialStart.getTime() / 1000),
          trial_end: Math.floor(trialEnd.getTime() / 1000),
          items: {
            data: [
              {
                price: {
                  id: "price_founding_solo",
                  unit_amount: 2900,
                  currency: "usd",
                  recurring: { interval: "month" },
                },
              },
            ],
          },
        },
      },
      { workspaceReady: true },
    );
    const copy = signupSuccessCopy(facts, { checkoutSessionId: "cs_test_new" });
    const text = copy.paragraphs.join(" ");

    assert.equal(copy.title, "Your office is ready.");
    assert.equal(copy.primaryHref, signupOfficeEnterHref("cs_test_new", "solo"));
    assert.equal(copy.primaryLabel, "Open your office");
    assert.doesNotMatch(copy.primaryHref, /\/login|\/today/);
    assert.match(text, /Founding Solo/);
    assert.match(text, /Trialing until/);
    assert.match(text, /90 days/);
    assert.match(text, /\$0 is due until then/);
    assert.match(text, /\$29\.00\/month/);
    assert.match(text, new RegExp(formatDate(trialEnd)));
    assert.doesNotMatch(text, /Billing has not started/);
    assert.doesNotMatch(text, /14-day/);
  });
});

test("completed standard checkout copy uses the 14-day trial and standard amount", () => {
  withPriceEnv({ STRIPE_PRICE_SOLO_MONTHLY: "price_standard_solo" }, () => {
    const trialStart = new Date("2026-10-23T00:00:00.000Z");
    const trialEnd = new Date(trialStart.getTime() + 14 * 86_400_000);
    const copy = signupSuccessCopy(
      checkoutFactsFromStripeSession({
        status: "complete",
        payment_status: "paid",
        metadata: { planSlug: "solo", signupSource: "public-signup" },
        subscription: {
          status: "trialing",
          trial_start: Math.floor(trialStart.getTime() / 1000),
          trial_end: Math.floor(trialEnd.getTime() / 1000),
          items: {
            data: [
              {
                price: {
                  id: "price_standard_solo",
                  unit_amount: 4900,
                  currency: "usd",
                  recurring: { interval: "month" },
                },
              },
            ],
          },
        },
      }),
      { checkoutSessionId: "cs_test_standard" },
    );
    const text = copy.paragraphs.join(" ");

    assert.equal(copy.title, "Checkout is complete.");
    assert.equal(copy.primaryHref, signupOfficeEnterHref("cs_test_standard", "solo"));
    assert.equal(copy.primaryLabel, "Open your office");
    assert.doesNotMatch(copy.primaryHref, /\/login|\/today/);
    assert.match(text, /Solo\. Checkout is complete/);
    assert.doesNotMatch(text, /Founding Solo/);
    assert.match(text, /14 days/);
    assert.match(text, /\$49\.00\/month/);
  });
});

test("missing checkout session keeps a login path without claiming billing never started", () => {
  const copy = signupSuccessCopy(checkoutFactsFromStripeSession(null));
  const text = copy.paragraphs.join(" ");

  assert.equal(copy.title, "We could not confirm checkout.");
  assert.equal(copy.primaryHref, "/login");
  assert.equal(copy.primaryLabel, "Log in");
  assert.equal(copy.secondaryHref, "/signup");
  assert.match(text, /90-day trial/);
  assert.match(text, /14-day trial/);
  assert.doesNotMatch(text, /Billing has not started/);
  assert.doesNotMatch(text, /14-day trial\. Contact support if checkout did not finish/);
});

test("an existing session for another office still enters the checkout workspace", () => {
  withPriceEnv({ STRIPE_PRICE_FOUNDING_SOLO_MONTHLY: "price_founding_solo" }, () => {
    const navigation = decideSignupSuccessNavigation({
      sessionId: "cs_test_new",
      planSlug: "solo",
      signInAttemptFailed: false,
      currentUserId: "user_old",
    });

    assert.equal(navigation.type, "enter");
    if (navigation.type === "enter") {
      assert.equal(navigation.href, "/signup/success/enter?session_id=cs_test_new&plan=solo");
      assert.doesNotMatch(navigation.href, /\/login|\/today/);
    }

    const afterFailure = decideSignupSuccessNavigation({
      sessionId: "cs_test_new",
      planSlug: "solo",
      signInAttemptFailed: true,
      currentUserId: "user_old",
    });
    assert.equal(afterFailure.type, "render");

    const trialStart = new Date("2026-10-23T00:00:00.000Z");
    const trialEnd = new Date(trialStart.getTime() + 90 * 86_400_000);
    const copy = signupSuccessCopy(
      checkoutFactsFromStripeSession(
        {
          status: "complete",
          payment_status: "no_payment_required",
          metadata: { planSlug: "solo", signupSource: "founding" },
          subscription: {
            status: "trialing",
            trial_start: Math.floor(trialStart.getTime() / 1000),
            trial_end: Math.floor(trialEnd.getTime() / 1000),
            items: {
              data: [
                {
                  price: {
                    id: "price_founding_solo",
                    unit_amount: 2900,
                    currency: "usd",
                    recurring: { interval: "month" },
                  },
                },
              ],
            },
          },
        },
        { workspaceReady: true },
      ),
      {
        checkoutSessionId: "cs_test_new",
        currentUser: { name: "Old Owner", email: "old@example.com" },
      },
    );
    const text = copy.paragraphs.join(" ");

    assert.equal(copy.primaryHref, signupOfficeEnterHref("cs_test_new", "solo"));
    assert.equal(copy.primaryLabel, "Open your office");
    assert.match(text, /signed in as Old Owner \(old@example.com\)/);
    assert.match(text, /replaces the current sign-in/);
    assert.doesNotMatch(copy.primaryHref, /\/login|\/today/);
    assert.doesNotMatch(text, /Open it with the email and password from signup/);
  });
});

test("a signed-in visitor without a checkout session is not sent into the current office", () => {
  const copy = signupSuccessCopy(checkoutFactsFromStripeSession(null), {
    currentUser: { name: "Old Owner", email: "old@example.com" },
  });

  assert.equal(copy.primaryHref, "/signup");
  assert.equal(copy.primaryLabel, "Back to signup");
  assert.notEqual(copy.primaryHref, "/today");
  assert.notEqual(copy.primaryHref, "/login");
});

test("the replacement session cookie belongs to the checkout owner", () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-auth-secret";
  try {
    const now = 1_700_000_000_000;
    const built = buildOwnerSessionCookie("user_new", now);
    assert.ok(built);
    const payload = verifySignedSessionValue(built.sessionValue, "test-auth-secret", now);
    assert.equal(payload?.userId, "user_new");
    assert.notEqual(payload?.userId, "user_old");
    assert.equal(built.sessionName, "adjusterdesk_session");
    assert.equal(built.adminOverrideName, "adjusterdesk_admin_workspace");
  } finally {
    if (previous === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = previous;
    }
  }
});

test("signup success does not swallow the redirect into the office", () => {
  const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT;replace;/start?notice=self-service-signup-complete;307;",
  });

  assert.throws(() => rethrowIfNavigationError(redirectError), (error: unknown) => error === redirectError);
  assert.doesNotThrow(() => rethrowIfNavigationError(new Error("Checkout is not complete yet.")));
});
