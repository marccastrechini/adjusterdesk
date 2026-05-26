import { redirect } from "next/navigation";
import { ActionForm, FieldError } from "@/components/action-form";
import { Card, Field, SubmitButton, inputClassName } from "@/components/ui";
import { loginWithPassword } from "@/lib/auth-actions";
import { getCurrentSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentSessionUser();
  if (currentUser) {
    redirect("/today");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="text-center">
          <p className="text-sm font-medium text-teal-800">AdjusterDesk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use an active office user account to continue.</p>
        </div>

        <Card className="grid gap-4">
          <ActionForm action={loginWithPassword} className="grid gap-4">
            <Field label="Email">
              <input name="email" type="email" autoComplete="email" required className={inputClassName} />
              <FieldError name="email" />
            </Field>
            <Field label="Password">
              <input name="password" type="password" autoComplete="current-password" required className={inputClassName} />
              <FieldError name="password" />
            </Field>
            <SubmitButton>Sign in</SubmitButton>
          </ActionForm>
          <p className="text-xs leading-5 text-slate-500">Public client status links stay available without sign-in. OAuth, invites, and firm switching are not part of this MVP.</p>
        </Card>
      </div>
    </main>
  );
}