import Link from "next/link";
import { headers } from "next/headers";
import { ActionForm, FieldError } from "@/components/action-form";
import { BrandMark } from "@/components/brand-mark";
import { Card, Field, SubmitButton, inputClassName } from "@/components/ui";
import { brandName } from "@/lib/brand";
import { redeemEarlyAdopterInviteAction, signOutForEarlyAccess } from "@/lib/early-adopter-actions";
import { loadEarlyAccess } from "@/lib/early-adopter-db";
import {
  earlyAdopterClientIp,
  earlyAdopterInvitePath,
  earlyAdopterRedeemLimited,
  earlyAdopterRedeemRateKey,
  recordEarlyAdopterRedeemFailure,
} from "@/lib/early-adopter";
import { getCurrentSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EarlyAccessPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const token = firstValue(query.token)?.trim() ?? "";
  const headerList = await headers();
  const rateKey = earlyAdopterRedeemRateKey(earlyAdopterClientIp(headerList.get("x-forwarded-for"), headerList.get("x-real-ip")));
  const rateLimited = earlyAdopterRedeemLimited(rateKey);
  const sessionUser = await getCurrentSessionUser();
  const view = await loadEarlyAccess({
    token,
    now: new Date(),
    signedInEmail: sessionUser?.email ?? null,
    rateLimited,
  });
  if (view.kind === "invalid") {
    recordEarlyAdopterRedeemFailure(rateKey);
  }

  const returnTo = token ? earlyAdopterInvitePath(token) : "/early-access";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <p className="mt-3 text-sm font-medium text-teal-800">{brandName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Early access</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">No card. Create your office, or sign in if this email already has an account.</p>
        </div>

        <Card className="grid gap-4">
          {view.kind === "missing" || view.kind === "invalid" ? (
            <p className="text-sm leading-6 text-slate-700">This invite link is not valid.</p>
          ) : null}
          {view.kind === "rate-limited" ? <p className="text-sm leading-6 text-slate-700">Too many attempts. Wait a few minutes and try the link again.</p> : null}
          {view.kind === "expired" ? <p className="text-sm leading-6 text-slate-700">This invite has expired. Ask {brandName} to send a new one.</p> : null}
          {view.kind === "revoked" ? <p className="text-sm leading-6 text-slate-700">This invite is no longer available.</p> : null}
          {view.kind === "redeemed" ? (
            <p className="text-sm leading-6 text-slate-700">
              This invite has already been used. <Link href="/login" className="font-medium text-teal-800 hover:underline">Sign in</Link> if this is your office.
            </p>
          ) : null}
          {view.kind === "email-mismatch" ? (
            <div className="grid gap-3 text-sm leading-6 text-slate-700">
              <p>You are signed in as {view.signedInEmail}. This invite can only be used by {view.inviteEmail}.</p>
              <form action={signOutForEarlyAccess}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <SubmitButton variant="secondary">Sign out</SubmitButton>
              </form>
            </div>
          ) : null}
          {view.kind === "paid-workspace" ? (
            <p className="text-sm leading-6 text-slate-700">This email already belongs to a paid workspace. Ask {brandName} before changing billing.</p>
          ) : null}
          {view.kind === "inactive-user" || view.kind === "system-admin" ? (
            <p className="text-sm leading-6 text-slate-700">This invite cannot be applied to the account for {view.inviteEmail}. Ask {brandName} for a different address.</p>
          ) : null}
          {view.kind === "sign-in" ? (
            <div className="grid gap-3 text-sm leading-6 text-slate-700">
              <p>An account already exists for {view.inviteEmail}. Sign in with that email to turn on early access. No card is collected.</p>
              <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="font-medium text-teal-800 hover:underline">
                Sign in to continue
              </Link>
            </div>
          ) : null}
          {view.kind === "activate" ? (
            <ActionForm action={redeemEarlyAdopterInviteAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="intent" value="activate" />
              <p className="text-sm leading-6 text-slate-700">Signed in as {view.inviteEmail}. Activate early access for this office. There is no card and no trial end.</p>
              <SubmitButton>Activate early access</SubmitButton>
            </ActionForm>
          ) : null}
          {view.kind === "register" ? (
            <ActionForm action={redeemEarlyAdopterInviteAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="intent" value="register" />
              <Field label="Email">
                <input value={view.inviteEmail} readOnly className={inputClassName} />
              </Field>
              <Field label="Your name" required>
                <input name="ownerName" defaultValue={view.name ?? ""} autoComplete="name" required className={inputClassName} />
              </Field>
              <FieldError name="ownerName" />
              <Field label="Office name" required>
                <input name="officeName" autoComplete="organization" required className={inputClassName} />
              </Field>
              <Field label="Password" hint="Use at least 8 characters." required>
                <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClassName} />
              </Field>
              <FieldError name="password" />
              <Field label="Confirm password" required>
                <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className={inputClassName} />
              </Field>
              <FieldError name="confirmPassword" />
              <SubmitButton>Create office</SubmitButton>
            </ActionForm>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
