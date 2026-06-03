import { SubscriptionStatus } from "@/generated/prisma/client";

export const TRIAL_DAYS = 14;

export type TrialPromptState = "comfortable" | "ending-soon" | "ending-imminent" | "expired" | "none";

type FirmTrialFields = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
};

/**
 * Returns the trial end date given a start date.
 */
export function trialEndDate(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}

/**
 * Returns how many full days remain until the trial ends (can be negative when expired).
 */
export function trialDaysRemaining(trialEndsAt: Date): number {
  const now = new Date();
  const ms = trialEndsAt.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Derives the trial prompt state for a firm.
 *
 * - "none"              — not on trial (active subscription, manual, etc.)
 * - "comfortable"       — trial is active with more than 7 days remaining
 * - "ending-soon"       — 2–7 days remaining
 * - "ending-imminent"   — 0–1 days remaining
 * - "expired"           — trial period has passed, no active subscription
 */
export function trialPromptState(firm: FirmTrialFields): TrialPromptState {
  if (firm.subscriptionStatus === SubscriptionStatus.ACTIVE) {
    return "none";
  }

  if (firm.subscriptionStatus !== SubscriptionStatus.TRIAL) {
    return "none";
  }

  if (!firm.trialEndsAt) {
    return "comfortable";
  }

  const days = trialDaysRemaining(firm.trialEndsAt);

  if (days < 0) {
    return "expired";
  }

  if (days <= 1) {
    return "ending-imminent";
  }

  if (days <= 7) {
    return "ending-soon";
  }

  return "comfortable";
}
