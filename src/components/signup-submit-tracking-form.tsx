"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/action-form";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { ActionFormState } from "@/lib/form-state";

type FormAction = (state: ActionFormState, formData: FormData) => ActionFormState | Promise<ActionFormState>;

export function SignupSubmitTrackingForm({
  action,
  className,
  children,
}: {
  action: FormAction;
  className?: string;
  children: React.ReactNode;
}) {
  const hasTrackedSubmitRef = useRef(false);

  function handleSubmitCapture(form: HTMLFormElement) {
    if (hasTrackedSubmitRef.current) {
      return;
    }

    const formData = new FormData(form);
    const plan = formData.get("plan");

    trackAnalyticsEvent("signup_submit", {
      source: "public_signup",
      plan: typeof plan === "string" && plan.length > 0 ? plan : "unknown",
      account_type: "trial",
      event_category: "signup",
    });

    hasTrackedSubmitRef.current = true;
  }

  return (
    <ActionForm action={action} className={className} onSubmitCapture={handleSubmitCapture}>
      {children}
    </ActionForm>
  );
}
