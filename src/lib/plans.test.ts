import assert from "node:assert/strict";
import test from "node:test";
import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import {
  canAddActiveUser,
  countActiveUsers,
  defaultIncludedUserLimit,
  planLabel,
  planLimitMessage,
  resolveIncludedUserLimit,
  subscriptionStatusLabel,
} from "@/lib/plans";

test("plan labels and defaults are stable", () => {
  assert.equal(planLabel(SubscriptionPlan.SOLO), "Solo");
  assert.equal(planLabel(SubscriptionPlan.SMALL_OFFICE), "Small Office");
  assert.equal(planLabel(SubscriptionPlan.TEAM), "Team");
  assert.equal(planLabel(SubscriptionPlan.PROFESSIONAL), "Professional");

  assert.equal(defaultIncludedUserLimit(SubscriptionPlan.SOLO), 1);
  assert.equal(defaultIncludedUserLimit(SubscriptionPlan.SMALL_OFFICE), 3);
  assert.equal(defaultIncludedUserLimit(SubscriptionPlan.TEAM), 7);
  assert.equal(defaultIncludedUserLimit(SubscriptionPlan.PROFESSIONAL), undefined);
});

test("subscription status labels are plain language", () => {
  assert.equal(subscriptionStatusLabel(SubscriptionStatus.TRIAL), "Trial");
  assert.equal(subscriptionStatusLabel(SubscriptionStatus.ACTIVE), "Active");
  assert.equal(subscriptionStatusLabel(SubscriptionStatus.PAST_DUE), "Past due");
  assert.equal(subscriptionStatusLabel(SubscriptionStatus.CANCELED), "Canceled");
  assert.equal(subscriptionStatusLabel(SubscriptionStatus.MANUAL), "Manual");
});

test("active user counting and limit checks follow plan rules", () => {
  const users = [{ active: true }, { active: false }, { active: true }];
  assert.equal(countActiveUsers(users), 2);

  assert.equal(resolveIncludedUserLimit({ subscriptionPlan: SubscriptionPlan.SMALL_OFFICE, includedUserLimit: 3 }), 3);
  assert.equal(resolveIncludedUserLimit({ subscriptionPlan: SubscriptionPlan.PROFESSIONAL, includedUserLimit: 5 }), 5);
  assert.equal(resolveIncludedUserLimit({ subscriptionPlan: SubscriptionPlan.PROFESSIONAL, includedUserLimit: 0 }), 0);

  assert.equal(canAddActiveUser({ activeUserCount: 2, includedUserLimit: 3 }), true);
  assert.equal(canAddActiveUser({ activeUserCount: 3, includedUserLimit: 3 }), false);
  assert.equal(canAddActiveUser({ activeUserCount: 5, includedUserLimit: 0 }), true);
});

test("plan limit messaging handles available, at-limit, and over-limit states", () => {
  assert.equal(
    planLimitMessage({ activeUserCount: 2, includedUserLimit: 3 }),
    "2 of 3 included active users in use.",
  );
  assert.equal(
    planLimitMessage({ activeUserCount: 3, includedUserLimit: 3 }),
    "This office is at its included active-user limit. Deactivate a user or contact support to change plans before inviting another active user.",
  );
  assert.equal(
    planLimitMessage({ activeUserCount: 4, includedUserLimit: 3 }),
    "This office has more active users than the included limit. Existing users can continue for now, but new active users are blocked until the plan or limit is updated.",
  );
});
