import assert from "node:assert/strict";
import { test } from "node:test";
import { SubscriptionStatus, UserRole } from "@/generated/prisma/client";
import { canManageBilling, canStartSubscriptionForStatus } from "@/lib/billing-conversion";
import { parsePlanSlug } from "@/lib/billing";

test("billing conversion allows only explicit statuses", () => {
  assert.equal(canStartSubscriptionForStatus(SubscriptionStatus.TRIAL), true);
  assert.equal(canStartSubscriptionForStatus(SubscriptionStatus.PAST_DUE), true);
  assert.equal(canStartSubscriptionForStatus(SubscriptionStatus.CANCELED), true);
  assert.equal(canStartSubscriptionForStatus(SubscriptionStatus.ACTIVE), false);
  assert.equal(canStartSubscriptionForStatus(SubscriptionStatus.MANUAL), false);
});

test("billing conversion requires owner role or system admin", () => {
  assert.equal(canManageBilling({ role: UserRole.OWNER, isSystemAdmin: false }), true);
  assert.equal(canManageBilling({ role: UserRole.ADJUSTER, isSystemAdmin: true }), true);
  assert.equal(canManageBilling({ role: UserRole.ADJUSTER, isSystemAdmin: false }), false);
  assert.equal(canManageBilling({ role: UserRole.ASSISTANT, isSystemAdmin: false }), false);
});

test("billing conversion parses only supported plan slugs", () => {
  assert.equal(parsePlanSlug("solo"), "solo");
  assert.equal(parsePlanSlug("small-office"), "small-office");
  assert.equal(parsePlanSlug("team"), "team");
  assert.equal(parsePlanSlug("enterprise"), null);
  assert.equal(parsePlanSlug(""), null);
  assert.equal(parsePlanSlug(undefined), null);
});
