import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, FieldError } from "@/components/action-form";
import { Card, Field, Notice, SubmitButton, inputClassName } from "@/components/ui";
import { requestPasswordResetWithState } from "@/lib/auth-actions";
import { getNoticeMessage } from "@/lib/notices";
import { getCurrentSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentSessionUser();
  if (currentUser) {
    redirect("/today");
  }

  const query = await searchParams;
  const notice = getNoticeMessage(query);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="text-center">
          <p className="text-sm font-medium text-teal-800">AdjusterDesk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Forgot password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Enter your account email and we will send a reset link if the account is active.</p>
        </div>

        {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

        <Card className="grid gap-4">
          <ActionForm action={requestPasswordResetWithState} className="grid gap-4">
            <Field label="Email" required>
              <input name="email" type="email" autoComplete="email" required className={inputClassName} />
            </Field>
            <FieldError name="email" />
            <SubmitButton>Send reset link</SubmitButton>
          </ActionForm>

          <div className="text-sm">
            <Link href="/login" className="font-medium text-teal-800 hover:text-teal-900 hover:underline">
              Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}