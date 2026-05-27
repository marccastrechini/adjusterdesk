import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, FieldError } from "@/components/action-form";
import { Card, Field, SubmitButton, inputClassName } from "@/components/ui";
import { resetPasswordWithTokenWithState } from "@/lib/auth-actions";
import { getCurrentSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentSessionUser();
  if (currentUser) {
    redirect("/today");
  }

  const query = await searchParams;
  const tokenParam = query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? "" : tokenParam ?? "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="text-center">
          <p className="text-sm font-medium text-teal-800">AdjusterDesk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Set a new sign-in password for your account.</p>
        </div>

        <Card className="grid gap-4">
          {token ? (
            <ActionForm action={resetPasswordWithTokenWithState} className="grid gap-3">
              <input type="hidden" name="token" value={token} />

              <Field label="New password" hint="Use at least 8 characters." required>
                <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required className={inputClassName} />
              </Field>
              <FieldError name="newPassword" />

              <Field label="Confirm new password" required>
                <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className={inputClassName} />
              </Field>
              <FieldError name="confirmPassword" />

              <div className="pt-1">
                <SubmitButton>Reset password</SubmitButton>
              </div>
            </ActionForm>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Reset link missing</p>
              <p className="mt-1 leading-6">This reset link is incomplete. Request a new password reset email.</p>
            </div>
          )}

          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-teal-800 hover:text-teal-900 hover:underline">
              Request a new reset link
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}