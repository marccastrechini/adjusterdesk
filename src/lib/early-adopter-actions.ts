"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSystemAdminContext } from "@/lib/app-context";
import { hashPassword, resolveAppBaseUrl, resolveAuthSecret } from "@/lib/auth";
import { sendEarlyAdopterInviteEmail } from "@/lib/email";
import {
  earlyAdopterInviteUrl,
  earlyAdopterRedeemLimited,
  earlyAdopterRedeemRateKey,
  normalizeInviteEmail,
  parseInviteExpiryDays,
  recordEarlyAdopterRedeemFailure,
  safeEarlyAdopterInviteUrl,
  safeEarlyAccessReturnPath,
} from "@/lib/early-adopter";
import {
  issueEarlyAdopterInvite,
  loadEarlyAccess,
  markEarlyAdopterInviteSent,
  redeemEarlyAdopterInvite,
  revokeEarlyAdopterInvite,
  rotateEarlyAdopterInvite,
} from "@/lib/early-adopter-db";
import { formError, type ActionFormState } from "@/lib/form-state";
import { withNotice } from "@/lib/notices";
import { clearSession, createSessionForUser, getCurrentSessionUser } from "@/lib/session";

const revealCookieName = "early_adopter_invite_link";

function revealCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/system/early-adopters",
    maxAge,
  };
}

async function rememberInviteLink(token: string) {
  const url = earlyAdopterInviteUrl(resolveAppBaseUrl(), token);
  const jar = await cookies();
  jar.set(revealCookieName, url, revealCookieOptions(60 * 10));
  return url;
}

function optionalText(value: FormDataEntryValue | null, max: number) {
  const text = value?.toString().trim() ?? "";
  if (!text) {
    return null;
  }
  return text.slice(0, max);
}

function formatExpiry(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

async function deliverInvite(input: { token: string; email: string; name: string | null; expiresAt: Date; inviteId: string; now: Date }) {
  const url = await rememberInviteLink(input.token);
  const sent = await sendEarlyAdopterInviteEmail({
    toEmail: input.email,
    recipientName: input.name,
    inviteUrl: url,
    expiresOn: formatExpiry(input.expiresAt),
  });
  if (sent.ok) {
    await markEarlyAdopterInviteSent(input.inviteId, input.now);
  }
  return sent.ok;
}

export async function createEarlyAdopterInviteAction(formData: FormData) {
  const actor = await requireSystemAdminContext();
  const email = normalizeInviteEmail(formData.get("email")?.toString());
  const expiresInDays = parseInviteExpiryDays(formData.get("expiresInDays")?.toString());
  if (!email) {
    redirect("/system/early-adopters?error=email");
  }
  if (!expiresInDays) {
    redirect("/system/early-adopters?error=expiry");
  }

  const now = new Date();
  const issued = await issueEarlyAdopterInvite({
    actorUserId: actor.id,
    email,
    name: optionalText(formData.get("name"), 120),
    note: optionalText(formData.get("note"), 500),
    expiresInDays,
    now,
  });
  if (!issued.ok) {
    redirect("/system/early-adopters?error=already-open");
  }

  const emailed = await deliverInvite({
    token: issued.token,
    email: issued.invite.email,
    name: issued.invite.name,
    expiresAt: issued.invite.expiresAt,
    inviteId: issued.invite.id,
    now,
  });
  redirect(withNotice("/system/early-adopters", emailed ? "early-adopter-sent" : "early-adopter-link-only"));
}

export async function resendEarlyAdopterInviteAction(formData: FormData) {
  await requireSystemAdminContext();
  const inviteId = formData.get("inviteId")?.toString() ?? "";
  const now = new Date();
  const rotated = await rotateEarlyAdopterInvite({ inviteId, now });
  if (!rotated.ok) {
    redirect("/system/early-adopters?error=resend");
  }
  const emailed = await deliverInvite({
    token: rotated.token,
    email: rotated.invite.email,
    name: rotated.invite.name,
    expiresAt: rotated.invite.expiresAt,
    inviteId: rotated.invite.id,
    now,
  });
  redirect(withNotice("/system/early-adopters", emailed ? "early-adopter-resent" : "early-adopter-link-only"));
}

export async function copyEarlyAdopterInviteLinkAction(formData: FormData) {
  await requireSystemAdminContext();
  const inviteId = formData.get("inviteId")?.toString() ?? "";
  const rotated = await rotateEarlyAdopterInvite({ inviteId, now: new Date() });
  if (!rotated.ok) {
    redirect("/system/early-adopters?error=copy");
  }
  await rememberInviteLink(rotated.token);
  redirect(withNotice("/system/early-adopters", "early-adopter-link-copied"));
}

export async function revokeEarlyAdopterInviteAction(formData: FormData) {
  await requireSystemAdminContext();
  const inviteId = formData.get("inviteId")?.toString() ?? "";
  const revoked = await revokeEarlyAdopterInvite({ inviteId, now: new Date() });
  if (!revoked.ok) {
    redirect("/system/early-adopters?error=revoke");
  }
  redirect(withNotice("/system/early-adopters", "early-adopter-revoked"));
}

export async function dismissEarlyAdopterLinkReveal() {
  await requireSystemAdminContext();
  const jar = await cookies();
  jar.set(revealCookieName, "", revealCookieOptions(0));
  redirect("/system/early-adopters");
}

export async function readEarlyAdopterLinkReveal() {
  await requireSystemAdminContext();
  const jar = await cookies();
  const value = jar.get(revealCookieName)?.value;
  if (!value) {
    return null;
  }
  return safeEarlyAdopterInviteUrl(value, resolveAppBaseUrl());
}

export async function redeemEarlyAdopterInviteAction(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const token = formData.get("token")?.toString() ?? "";
  const safePath = safeEarlyAccessReturnPath(`/early-access?token=${token}`);
  const headerList = await headers();
  const rateKey = earlyAdopterRedeemRateKey(headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown");
  if (!safePath) {
    recordEarlyAdopterRedeemFailure(rateKey);
    return formError("This invite link is not valid.");
  }
  if (earlyAdopterRedeemLimited(rateKey)) {
    return formError("Too many attempts. Wait a few minutes and try again.");
  }

  const sessionUser = await getCurrentSessionUser();
  const now = new Date();
  const view = await loadEarlyAccess({
    token,
    now,
    signedInEmail: sessionUser?.email ?? null,
    rateLimited: false,
  });
  if (view.kind === "invalid") {
    recordEarlyAdopterRedeemFailure(rateKey);
    return formError("This invite link is not valid.");
  }

  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";
  const intent = formData.get("intent")?.toString();
  let passwordHash: string | undefined;
  if (view.kind === "register" && intent === "register") {
    if (!resolveAuthSecret()) {
      return formError("Sign-in is not configured on this server yet.");
    }
    if (password.length < 8) {
      return formError("Use at least 8 characters for your password.", { password: "Use at least 8 characters." });
    }
    if (password !== confirmPassword) {
      return formError("Passwords do not match.", { confirmPassword: "Passwords do not match." });
    }
    passwordHash = hashPassword(password);
  }

  const result = await redeemEarlyAdopterInvite({
    token,
    now,
    signedInEmail: sessionUser?.email ?? null,
    officeName: formData.get("officeName")?.toString(),
    ownerName: formData.get("ownerName")?.toString(),
    passwordHash,
  });

  if (!result.ok) {
    if (result.code === "invalid" || result.code === "taken") {
      recordEarlyAdopterRedeemFailure(rateKey);
    }
    if (result.code === "invalid-form") {
      return formError("Enter your name, office name, and a password of at least 8 characters.");
    }
    if (result.code === "email-mismatch") {
      return formError("This invite can only be used by the email address it was sent to. Sign out and open the link again.");
    }
    if (result.code === "paid-workspace") {
      return formError("This email already belongs to a paid workspace. Ask PA ClaimBoard before changing billing.");
    }
    if (result.code === "expired") {
      return formError("This invite has expired. Ask PA ClaimBoard to send a new one.");
    }
    if (result.code === "redeemed" || result.code === "taken") {
      return formError("This invite has already been used.");
    }
    if (result.code === "revoked") {
      return formError("This invite is no longer available.");
    }
    return formError("This invite link is not valid.");
  }

  if (intent === "register") {
    const sessionCreated = await createSessionForUser(result.userId);
    if (!sessionCreated) {
      return formError("Your office was created, but sign-in is not configured on this server yet.");
    }
  }

  redirect(withNotice("/today", "early-adopter-ready"));
}

export async function signOutForEarlyAccess(formData: FormData) {
  const returnTo = safeEarlyAccessReturnPath(formData.get("returnTo")?.toString());
  await clearSession();
  redirect(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
}
