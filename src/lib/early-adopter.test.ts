import assert from "node:assert/strict";
import { test } from "node:test";
import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { renderEarlyAdopterInviteEmail } from "@/lib/email";
import { brandName } from "@/lib/brand";
import {
  EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS,
  EARLY_ADOPTER_INCLUDED_USERS,
  canConvertWorkspaceToEarlyAdopter,
  createEarlyAdopterToken,
  describeEarlyAccess,
  earlyAdopterFirmFields,
  earlyAdopterInviteStatus,
  earlyAdopterInviteUrl,
  earlyAdopterRedeemFailureLimit,
  earlyAdopterRedeemLimited,
  earlyAdopterRedeemRateKey,
  emailsMatch,
  hashEarlyAdopterToken,
  normalizeInviteEmail,
  parseInviteExpiryDays,
  recordEarlyAdopterRedeemFailure,
  resetEarlyAdopterRedeemLimits,
  safeEarlyAccessReturnPath,
  safeEarlyAdopterInviteUrl,
  type EarlyAdopterInviteSnapshot,
  type EarlyAdopterWorkspace,
} from "@/lib/early-adopter";

function invite(overrides: Partial<EarlyAdopterInviteSnapshot> = {}): EarlyAdopterInviteSnapshot {
  return {
    id: "inv_1",
    email: "ada@example.com",
    name: "Ada",
    note: null,
    tokenHash: "hash",
    expiresInDays: 30,
    expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    revokedAt: null,
    redeemedAt: null,
    firmId: null,
    redeemedByUserId: null,
    ...overrides,
  };
}

function workspace(overrides: Partial<EarlyAdopterWorkspace> = {}): EarlyAdopterWorkspace {
  return {
    userId: "user_1",
    userName: "Ada",
    firmId: "firm_1",
    firmName: "Ada Adjusting",
    active: true,
    isSystemAdmin: false,
    subscriptionPlan: SubscriptionPlan.SMALL_OFFICE,
    subscriptionStatus: SubscriptionStatus.TRIAL,
    billingSubscriptionId: null,
    ...overrides,
  };
}

const now = new Date("2026-10-23T00:00:00.000Z");

test("early adopter tokens are unguessable and only the hash is comparable", () => {
  const first = createEarlyAdopterToken();
  const second = createEarlyAdopterToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{43,}$/);
  assert.equal(hashEarlyAdopterToken(first), hashEarlyAdopterToken(first));
  assert.notEqual(hashEarlyAdopterToken(first), first);
  assert.notEqual(hashEarlyAdopterToken(first), hashEarlyAdopterToken(second));
});

test("invite status prefers redeemed, then revoked, then expiry", () => {
  assert.equal(earlyAdopterInviteStatus(invite(), now), "pending");
  assert.equal(earlyAdopterInviteStatus(invite({ expiresAt: new Date("2026-10-01T00:00:00.000Z") }), now), "expired");
  assert.equal(earlyAdopterInviteStatus(invite({ revokedAt: now, expiresAt: new Date("2026-10-01T00:00:00.000Z") }), now), "revoked");
  assert.equal(earlyAdopterInviteStatus(invite({ redeemedAt: now, revokedAt: now }), now), "redeemed");
});

test("expiry days default to 30 and stay inside 1 to 90", () => {
  assert.equal(parseInviteExpiryDays(""), EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS);
  assert.equal(parseInviteExpiryDays(" 30 "), 30);
  assert.equal(parseInviteExpiryDays("1"), 1);
  assert.equal(parseInviteExpiryDays("90"), 90);
  assert.equal(parseInviteExpiryDays("0"), null);
  assert.equal(parseInviteExpiryDays("91"), null);
  assert.equal(parseInviteExpiryDays("30 days"), null);
});

test("email mismatch is a blocked view, not a warning", () => {
  assert.equal(emailsMatch("Ada@Example.com", "ada@example.com"), true);
  const view = describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite(),
    now,
    signedInEmail: "other@example.com",
    existingWorkspace: null,
  });
  assert.equal(view.kind, "email-mismatch");
});

test("a new email can register and an existing unpaid email must sign in", () => {
  assert.equal(describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite(),
    now,
    signedInEmail: null,
    existingWorkspace: null,
  }).kind, "register");

  assert.equal(describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite(),
    now,
    signedInEmail: null,
    existingWorkspace: workspace(),
  }).kind, "sign-in");

  assert.equal(describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite(),
    now,
    signedInEmail: "ada@example.com",
    existingWorkspace: workspace(),
  }).kind, "activate");
});

test("paid, inactive, and system-admin accounts cannot redeem", () => {
  assert.equal(canConvertWorkspaceToEarlyAdopter(workspace()), true);
  assert.equal(canConvertWorkspaceToEarlyAdopter(workspace({ billingSubscriptionId: "sub_123" })), false);
  assert.equal(canConvertWorkspaceToEarlyAdopter(workspace({ subscriptionStatus: SubscriptionStatus.ACTIVE })), false);
  assert.equal(canConvertWorkspaceToEarlyAdopter(workspace({ subscriptionStatus: SubscriptionStatus.PAST_DUE })), false);
  assert.equal(describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite(),
    now,
    signedInEmail: "ada@example.com",
    existingWorkspace: workspace({ billingSubscriptionId: "sub_123", subscriptionStatus: SubscriptionStatus.ACTIVE }),
  }).kind, "paid-workspace");
  assert.equal(describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite(),
    now,
    signedInEmail: null,
    existingWorkspace: workspace({ isSystemAdmin: true }),
  }).kind, "system-admin");
});

test("early adopter offices have no stripe billing and no trial end", () => {
  const fields = earlyAdopterFirmFields();
  assert.equal(fields.subscriptionPlan, SubscriptionPlan.EARLY_ADOPTER);
  assert.equal(fields.subscriptionStatus, SubscriptionStatus.MANUAL);
  assert.equal(fields.includedUserLimit, EARLY_ADOPTER_INCLUDED_USERS);
  assert.equal(fields.trialEndsAt, null);
  assert.equal(fields.billingCustomerId, null);
  assert.equal(fields.billingSubscriptionId, null);
  assert.equal(fields.billingPriceId, null);
});

test("return paths stay on the early-access token and reject other destinations", () => {
  const token = createEarlyAdopterToken();
  const path = `/early-access?token=${token}`;
  assert.equal(safeEarlyAccessReturnPath(path), path);
  assert.equal(safeEarlyAccessReturnPath("https://adjusterdesk.xyz/early-access?token=" + token), null);
  assert.equal(safeEarlyAccessReturnPath("//paclaimboard.com/early-access?token=" + token), null);
  assert.equal(safeEarlyAccessReturnPath("/today"), null);
  assert.equal(safeEarlyAccessReturnPath(`/early-access?token=${token}&next=/admin`), null);
  const url = earlyAdopterInviteUrl("https://paclaimboard.com", token);
  assert.equal(safeEarlyAdopterInviteUrl(url, "https://paclaimboard.com"), url);
  assert.equal(safeEarlyAdopterInviteUrl(`https://adjusterdesk.xyz/early-access?token=${token}`, "https://paclaimboard.com"), null);
});

test("failed redemption attempts are limited", () => {
  resetEarlyAdopterRedeemLimits();
  const key = earlyAdopterRedeemRateKey("203.0.113.5");
  const start = 1_700_000_000_000;
  for (let attempt = 0; attempt < earlyAdopterRedeemFailureLimit; attempt += 1) {
    assert.equal(earlyAdopterRedeemLimited(key, start), false);
    recordEarlyAdopterRedeemFailure(key, start);
  }
  assert.equal(earlyAdopterRedeemLimited(key, start), true);
  assert.equal(earlyAdopterRedeemLimited(key, start + 16 * 60 * 1000), false);
  resetEarlyAdopterRedeemLimits();
});

test("invite email renders the single-use link and does not send mail", () => {
  const token = createEarlyAdopterToken();
  const url = earlyAdopterInviteUrl("https://paclaimboard.com", token);
  const rendered = renderEarlyAdopterInviteEmail({
    toEmail: "ada@example.com",
    recipientName: "Ada",
    inviteUrl: url,
    expiresOn: "November 22, 2026",
  });
  assert.equal(rendered.subject, `Your ${brandName} early access invite`);
  assert.match(rendered.text, /no card/i);
  assert.match(rendered.text, /single-use/i);
  assert.ok(rendered.text.includes(url));
  assert.ok(rendered.html.includes(url));
  assert.equal(rendered.text.includes(hashEarlyAdopterToken(token)), false);
  assert.equal(normalizeInviteEmail("ada@example.com"), "ada@example.com");
});
