"use client";

import { createContext, type ReactNode, useActionState, useContext } from "react";
import { emptyActionFormState, type ActionFormState } from "@/lib/form-state";

type FormAction = (state: ActionFormState, formData: FormData) => ActionFormState | Promise<ActionFormState>;

const ActionFormContext = createContext<ActionFormState>(emptyActionFormState);

export function ActionForm({ action, children, className }: { action: FormAction; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, emptyActionFormState);

  return (
    <ActionFormContext.Provider value={state}>
      <form action={formAction} noValidate className={className}>
        {state.message ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">Please fix this before saving</p>
            <p className="mt-1 leading-6">{state.message}</p>
          </div>
        ) : null}
        {children}
      </form>
    </ActionFormContext.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const state = useContext(ActionFormContext);
  const error = state.fieldErrors?.[name];
  if (!error) return null;
  return <span className="text-xs leading-5 font-medium text-rose-700">{error}</span>;
}