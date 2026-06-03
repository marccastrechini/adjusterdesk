import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SubscriptionStatus } from "@/generated/prisma/client";
import { TRIAL_DAYS, trialEndDate, trialDaysRemaining, trialPromptState } from "@/lib/trial";

describe("trial helpers", () => {
  test("TRIAL_DAYS is 14", () => {
    assert.equal(TRIAL_DAYS, 14);
  });

  test("trialEndDate returns start date plus TRIAL_DAYS", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = trialEndDate(start);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    assert.equal(diffDays, TRIAL_DAYS);
  });

  test("trialDaysRemaining returns positive days for future date", () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
    const days = trialDaysRemaining(future);
    assert.ok(days >= 9 && days <= 10, `Expected 9-10 days, got ${days}`);
  });

  test("trialDaysRemaining returns negative for past date", () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const days = trialDaysRemaining(past);
    assert.ok(days < 0, `Expected negative, got ${days}`);
  });

  test("trialPromptState returns none for ACTIVE subscription", () => {
    const firm = { subscriptionStatus: SubscriptionStatus.ACTIVE, trialEndsAt: null };
    assert.equal(trialPromptState(firm), "none");
  });

  test("trialPromptState returns none for MANUAL subscription", () => {
    const firm = { subscriptionStatus: SubscriptionStatus.MANUAL, trialEndsAt: null };
    assert.equal(trialPromptState(firm), "none");
  });

  test("trialPromptState returns comfortable for trial with more than 7 days left", () => {
    const endsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
    const firm = { subscriptionStatus: SubscriptionStatus.TRIAL, trialEndsAt: endsAt };
    assert.equal(trialPromptState(firm), "comfortable");
  });

  test("trialPromptState returns ending-soon for 2-7 days left", () => {
    const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
    const firm = { subscriptionStatus: SubscriptionStatus.TRIAL, trialEndsAt: endsAt };
    assert.equal(trialPromptState(firm), "ending-soon");
  });

  test("trialPromptState returns ending-imminent for 0-1 days left", () => {
    const endsAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    const firm = { subscriptionStatus: SubscriptionStatus.TRIAL, trialEndsAt: endsAt };
    assert.equal(trialPromptState(firm), "ending-imminent");
  });

  test("trialPromptState returns expired when trialEndsAt is in the past", () => {
    const endsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const firm = { subscriptionStatus: SubscriptionStatus.TRIAL, trialEndsAt: endsAt };
    assert.equal(trialPromptState(firm), "expired");
  });

  test("trialPromptState returns comfortable for trial with no trialEndsAt set", () => {
    const firm = { subscriptionStatus: SubscriptionStatus.TRIAL, trialEndsAt: null };
    assert.equal(trialPromptState(firm), "comfortable");
  });
});
