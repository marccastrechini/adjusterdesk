"use client";

import { createContext, type ReactNode, useActionState, useContext, useEffect, useRef } from "react";
import { emptyActionFormState, type ActionFormState } from "@/lib/form-state";

type FormAction = (state: ActionFormState, formData: FormData) => ActionFormState | Promise<ActionFormState>;

const ActionFormContext = createContext<ActionFormState>(emptyActionFormState);

export function ActionForm({ action, children, className }: { action: FormAction; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, emptyActionFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    const values = state.fieldValues;
    if (!form || !values) return;

    for (const [name, value] of Object.entries(values)) {
      const element = form.elements.namedItem(name);
      if (!element || element instanceof RadioNodeList) continue;

      if (element instanceof HTMLInputElement) {
        if (element.type === "checkbox") {
          element.checked = value === true || value === "true";
        } else {
          element.value = String(value ?? "");
        }
        continue;
      }

      if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.value = String(value ?? "");
      }
    }

    // Never retain password values after a server-side validation failure.
    if (state.message) {
      for (const passwordInput of form.querySelectorAll<HTMLInputElement>('input[type="password"]')) {
        passwordInput.value = "";
      }
    }
  }, [state.fieldValues, state.message]);

  return (
    <ActionFormContext.Provider value={state}>
      <form ref={formRef} action={formAction} noValidate className={className}>
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