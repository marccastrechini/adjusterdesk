"use client";

import { ActionForm, FieldError } from "@/components/action-form";
import { Field, SubmitButton, inputClassName } from "@/components/ui";
import { changeOwnPasswordWithState } from "@/lib/auth-actions";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changeOwnPasswordWithState} className="grid gap-3">
      <Field label="Current password" required>
        <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClassName} />
      </Field>
      <FieldError name="currentPassword" />

      <Field label="New password" hint="Use at least 8 characters." required>
        <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required className={inputClassName} />
      </Field>
      <FieldError name="newPassword" />

      <Field label="Confirm new password" required>
        <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className={inputClassName} />
      </Field>
      <FieldError name="confirmPassword" />

      <div className="pt-1">
        <SubmitButton>Change password</SubmitButton>
      </div>
    </ActionForm>
  );
}
