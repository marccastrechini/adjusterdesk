import { createHash, randomBytes } from "node:crypto";
import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";

export const EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS = 30;
export const EARLY_ADOPTER_MIN_EXPIRY_DAYS = 1;
export const EARLY_ADOPTER_MAX_EXPIRY_DAYS = 90;
export const EARLY_ADOPTER_INCLUDED_USERS = 5;
export const EARLY_ADOPTER_SIGNUP_SOURCE = "early-adopter";
export const earlyAdopterRedeemFailureLimit = 8;
export const earlyAdopterRedeemWindowMs = 15 * 60 * 1000;

export type EarlyAdopterInviteStatus = "pending" | "redeemed" | "expired" | "revoked";

export type EarlyAdopterInviteSnapshot = {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  tokenHash: string;
  expiresInDays: number;
  expiresAt: Date;
  revokedAt: Date | null;
  redeemedAt: Date | null;
  firmId: string | null;
  redeemedByUserId: string | null;
};

export type EarlyAdopterWorkspace = {
  userId: string;
  userName: string;
  firmId: string;
  firmName: string;
  active: boolean;
  isSystemAdmin: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  billingSubscriptionId: string | null;
};

export type EarlyAccessView =
  | { kind: "missing" }
  | { kind: "rate-limited" }
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "redeemed" }
  | { kind: "email-mismatch"; inviteEmail: string; signedInEmail: string }
  | { kind: "paid-workspace"; inviteEmail: string }
  | { kind: "inactive-user"; inviteEmail: string }
  | { kind: "system-admin"; inviteEmail: string }
  | { kind: "sign-in"; inviteEmail: string; name: string | null }
  | { kind: "activate"; inviteEmail: string; name: string | null }
  | { kind: "register"; inviteEmail: string; name: string | null };

/**
 * A mismatch is blocked. The invite is for one address, and a different
 * signed-in account must not be able to consume it.
 */
export function emailsMatch(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function normalizeInviteEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return null;
  }
  return email;
}

export function parseInviteExpiryDays(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const days = Number.parseInt(trimmed, 10);
  if (days < EARLY_ADOPTER_MIN_EXPIRY_DAYS || days > EARLY_ADOPTER_MAX_EXPIRY_DAYS) {
    return null;
  }
  return days;
}

export function earlyAdopterInviteStatus(invite: Pick<EarlyAdopterInviteSnapshot, "redeemedAt" | "revokedAt" | "expiresAt">, now: Date): EarlyAdopterInviteStatus {
  if (invite.redeemedAt) {
    return "redeemed";
  }
  if (invite.revokedAt) {
    return "revoked";
  }
  if (invite.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }
  return "pending";
}

export function earlyAdopterExpiryDate(now: Date, days: number) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function createEarlyAdopterToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEarlyAdopterToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function earlyAdopterInvitePath(token: string) {
  return `/early-access?token=${encodeURIComponent(token)}`;
}

export function earlyAdopterInviteUrl(appBaseUrl: string, token: string) {
  return `${appBaseUrl.replace(/\/+$/, "")}${earlyAdopterInvitePath(token)}`;
}

export function safeEarlyAccessReturnPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.includes("\\") || trimmed.includes("//") || trimmed.includes("@") || /\s/.test(trimmed)) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(trimmed, "https://paclaimboard.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://paclaimboard.invalid" || url.pathname !== "/early-access") {
    return null;
  }
  const token = url.searchParams.get("token");
  if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return null;
  }
  if ([...url.searchParams.keys()].some((key) => key !== "token")) {
    return null;
  }
  return earlyAdopterInvitePath(token);
}

export function safeEarlyAdopterInviteUrl(value: string, appBaseUrl: string) {
  let url: URL;
  let base: URL;
  try {
    url = new URL(value);
    base = new URL(appBaseUrl);
  } catch {
    return null;
  }
  if (url.origin !== base.origin) {
    return null;
  }
  const safePath = safeEarlyAccessReturnPath(`${url.pathname}${url.search}`);
  if (!safePath) {
    return null;
  }
  return `${base.origin}${safePath}`;
}

/**
 * Paid or past-due workspaces are left alone. An existing unpaid office can
 * be marked Early adopter because each email can belong to only one office.
 */
export function canConvertWorkspaceToEarlyAdopter(workspace: Pick<EarlyAdopterWorkspace, "active" | "isSystemAdmin" | "subscriptionStatus" | "billingSubscriptionId">) {
  if (!workspace.active || workspace.isSystemAdmin) {
    return false;
  }
  if (workspace.billingSubscriptionId) {
    return false;
  }
  if (workspace.subscriptionStatus === SubscriptionStatus.ACTIVE || workspace.subscriptionStatus === SubscriptionStatus.PAST_DUE) {
    return false;
  }
  return true;
}

export function earlyAdopterFirmFields() {
  return {
    subscriptionPlan: SubscriptionPlan.EARLY_ADOPTER,
    subscriptionStatus: SubscriptionStatus.MANUAL,
    includedUserLimit: EARLY_ADOPTER_INCLUDED_USERS,
    trialStartedAt: null,
    trialEndsAt: null,
    billingStartedAt: null,
    billingCustomerId: null,
    billingSubscriptionId: null,
    billingPriceId: null,
    billingCurrentPeriodEnd: null,
    signupSource: EARLY_ADOPTER_SIGNUP_SOURCE,
  };
}

export function describeEarlyAccess(input: {
  tokenPresent: boolean;
  rateLimited: boolean;
  invite: EarlyAdopterInviteSnapshot | null;
  now: Date;
  signedInEmail: string | null;
  existingWorkspace: EarlyAdopterWorkspace | null;
}): EarlyAccessView {
  if (!input.tokenPresent) {
    return { kind: "missing" };
  }
  if (input.rateLimited) {
    return { kind: "rate-limited" };
  }
  if (!input.invite) {
    return { kind: "invalid" };
  }

  const status = earlyAdopterInviteStatus(input.invite, input.now);
  if (status === "expired") {
    return { kind: "expired" };
  }
  if (status === "revoked") {
    return { kind: "revoked" };
  }
  if (status === "redeemed") {
    return { kind: "redeemed" };
  }

  if (input.signedInEmail && !emailsMatch(input.signedInEmail, input.invite.email)) {
    return { kind: "email-mismatch", inviteEmail: input.invite.email, signedInEmail: input.signedInEmail };
  }

  if (input.existingWorkspace) {
    if (input.existingWorkspace.isSystemAdmin) {
      return { kind: "system-admin", inviteEmail: input.invite.email };
    }
    if (!input.existingWorkspace.active) {
      return { kind: "inactive-user", inviteEmail: input.invite.email };
    }
    if (!canConvertWorkspaceToEarlyAdopter(input.existingWorkspace)) {
      return { kind: "paid-workspace", inviteEmail: input.invite.email };
    }
    if (!input.signedInEmail) {
      return { kind: "sign-in", inviteEmail: input.invite.email, name: input.invite.name };
    }
    return { kind: "activate", inviteEmail: input.invite.email, name: input.invite.name };
  }

  return { kind: "register", inviteEmail: input.invite.email, name: input.invite.name };
}

type AttemptBucket = { failures: number; windowStartedAt: number };
const redeemFailureGlobal = globalThis as typeof globalThis & { __earlyAdopterRedeemFailures?: Map<string, AttemptBucket> };
const redeemFailures = redeemFailureGlobal.__earlyAdopterRedeemFailures ?? new Map<string, AttemptBucket>();
redeemFailureGlobal.__earlyAdopterRedeemFailures = redeemFailures;

export function resetEarlyAdopterRedeemLimits() {
  redeemFailures.clear();
}

export function earlyAdopterRedeemRateKey(ip: string) {
  const trimmed = ip.trim() || "unknown";
  return `redeem:${trimmed.slice(0, 80)}`;
}

export function earlyAdopterRedeemLimited(key: string, now = Date.now()) {
  const bucket = redeemFailures.get(key);
  if (!bucket) {
    return false;
  }
  if (now - bucket.windowStartedAt >= earlyAdopterRedeemWindowMs) {
    redeemFailures.delete(key);
    return false;
  }
  return bucket.failures >= earlyAdopterRedeemFailureLimit;
}

export function recordEarlyAdopterRedeemFailure(key: string, now = Date.now()) {
  const bucket = redeemFailures.get(key);
  if (!bucket || now - bucket.windowStartedAt >= earlyAdopterRedeemWindowMs) {
    redeemFailures.set(key, { failures: 1, windowStartedAt: now });
    return;
  }
  bucket.failures += 1;
}

export function earlyAdopterClientIp(forwardedFor: string | null, realIp: string | null) {
  const forwarded = forwardedFor?.split(",")[0]?.trim();
  return forwarded || realIp?.trim() || "unknown";
}
