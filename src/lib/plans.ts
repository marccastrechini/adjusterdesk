import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";

type FirmPlanFields = {
  subscriptionPlan: SubscriptionPlan;
  includedUserLimit: number;
};

type UserActiveField = {
  active: boolean;
};

export function planLabel(plan: SubscriptionPlan) {
  switch (plan) {
    case SubscriptionPlan.SOLO:
      return "Solo";
    case SubscriptionPlan.SMALL_OFFICE:
      return "Small Office";
    case SubscriptionPlan.TEAM:
      return "Team";
    case SubscriptionPlan.PROFESSIONAL:
      return "Professional";
    default:
      return "Plan";
  }
}

export function subscriptionStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.TRIAL:
      return "Trial";
    case SubscriptionStatus.ACTIVE:
      return "Active";
    case SubscriptionStatus.PAST_DUE:
      return "Past due";
    case SubscriptionStatus.CANCELED:
      return "Canceled";
    case SubscriptionStatus.MANUAL:
      return "Manual";
    default:
      return "Unknown";
  }
}

export function defaultIncludedUserLimit(plan: SubscriptionPlan) {
  switch (plan) {
    case SubscriptionPlan.SOLO:
      return 1;
    case SubscriptionPlan.SMALL_OFFICE:
      return 3;
    case SubscriptionPlan.TEAM:
      return 7;
    case SubscriptionPlan.PROFESSIONAL:
      return undefined;
    default:
      return undefined;
  }
}

export function resolveIncludedUserLimit(firm: FirmPlanFields) {
  const planDefault = defaultIncludedUserLimit(firm.subscriptionPlan);
  const candidate = typeof firm.includedUserLimit === "number" ? firm.includedUserLimit : planDefault;
  if (!candidate || candidate < 1) {
    return 0;
  }
  return candidate;
}

export function countActiveUsers<TUser extends UserActiveField>(users: TUser[]) {
  return users.reduce((total, user) => (user.active ? total + 1 : total), 0);
}

export function canAddActiveUser({
  activeUserCount,
  includedUserLimit,
}: {
  activeUserCount: number;
  includedUserLimit: number;
}) {
  if (includedUserLimit < 1) {
    return true;
  }

  return activeUserCount < includedUserLimit;
}

export function planLimitMessage({
  activeUserCount,
  includedUserLimit,
}: {
  activeUserCount: number;
  includedUserLimit: number;
}) {
  if (includedUserLimit < 1) {
    return "This office has a custom active-user limit.";
  }

  if (activeUserCount > includedUserLimit) {
    return "This office has more active users than the included limit. Existing users can continue for now, but new active users are blocked until the plan or limit is updated.";
  }

  if (activeUserCount >= includedUserLimit) {
    return "This office is at its included active-user limit. Deactivate a user or contact support to change plans before inviting another active user.";
  }

  return `${activeUserCount} of ${includedUserLimit} included active users in use.`;
}
