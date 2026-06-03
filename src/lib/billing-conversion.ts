import { SubscriptionStatus, UserRole } from "@/generated/prisma/client";

const subscriptionConversionStatuses = new Set<SubscriptionStatus>([
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.CANCELED,
]);

export function canStartSubscriptionForStatus(status: SubscriptionStatus) {
  return subscriptionConversionStatuses.has(status);
}

export function canManageBilling(args: { role: UserRole; isSystemAdmin: boolean }) {
  return args.isSystemAdmin || args.role === UserRole.OWNER;
}
