"use client";

import { useActionState } from "react";
import { resetSystemUserPasswordWithState, type ResetSystemUserPasswordState } from "@/lib/actions";
import { SubmitButton } from "@/components/ui";

const initialState: ResetSystemUserPasswordState = {};

export function SystemResetPasswordForm({ userId, workspaceId }: { userId: string; workspaceId: string }) {
  const [state, action] = useActionState(resetSystemUserPasswordWithState, initialState);

  return (
    <div className="grid gap-2">
      <form action={action}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <SubmitButton variant="secondary">Reset password</SubmitButton>
      </form>

      {state.error ? <p className="text-xs font-medium text-rose-700">{state.error}</p> : null}
      {state.message ? <p className="text-xs text-slate-600">{state.message}</p> : null}
      {state.temporaryPassword ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-semibold">Temporary password (shown once)</p>
          <p className="mt-1 break-all font-mono">{state.temporaryPassword}</p>
        </div>
      ) : null}
    </div>
  );
}
