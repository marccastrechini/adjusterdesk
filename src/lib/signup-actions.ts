"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, resolveAppBaseUrl } from "@/lib/auth";
import {
  findPublicPlanBySlug,
  resolveBillingProvider,
  selfServiceSignupEnabled,
  stripeConfigured,
} from "@/lib/billing";
import { formError, type ActionFormState, type FieldErrors, type FieldValues } from "@/lib/form-state";
import { withNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { createSessionForUser } from "@/lib/session";
import { canSendSystemEmail, sendTrialSignupAlertEmail, sendWelcomeSignupEmail } from "@/lib/email";
import { FOUNDING_OPS_ALERT, resolveSignupSource } from "@/lib/founding-offer";
import { beginPublicSignup } from "@/lib/signup";

const signupSchema = z
  .object({
    plan: z.enum(["solo", "small-office", "team"]).optional().default("small-office"),
    firmName: z.string().trim().min(2, "Enter your workspace name."),
    ownerName: z.string().trim().min(2, "Enter your full name."),
    ownerEmail: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
    ownerPhone: z.string().trim().max(40).optional(),
    password: z.string().min(8, "Use at least 8 characters for your password."),
    confirmPassword: z.string(),
    agreedToTerms: z.boolean().refine((value) => value === true, {
      message: "Agree to the Terms and Privacy Policy to continue.",
    }),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Password and confirmation must match.",
        path: ["confirmPassword"],
      });
    }
  });

function parseAgreement(formData: FormData) {
  const value = formData.get("agreedToTerms")?.toString();
  return value === "on" || value === "true";
}

function zodToFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function safeSignupFieldValues(values: {
  plan: string;
  firmName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  agreedToTerms: boolean;
}): FieldValues {
  return {
    plan: values.plan,
    firmName: values.firmName,
    ownerName: values.ownerName,
    ownerEmail: values.ownerEmail,
    ownerPhone: values.ownerPhone ?? "",
    agreedToTerms: values.agreedToTerms,
  };
}

export async function startSignupWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  if (!selfServiceSignupEnabled()) {
    return formError("Your selected plan and workspace details are saved first. We will confirm setup before billing begins.");
  }

  const submittedValues = {
    plan: formData.get("plan")?.toString() || "small-office",
    firmName: formData.get("firmName")?.toString() ?? "",
    ownerName: formData.get("ownerName")?.toString() ?? "",
    ownerEmail: formData.get("ownerEmail")?.toString() ?? "",
    ownerPhone: formData.get("ownerPhone")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    agreedToTerms: parseAgreement(formData),
  };

  const parsed = signupSchema.safeParse(submittedValues);

  if (!parsed.success) {
    return formError(
      "Fix the highlighted fields and try again.",
      zodToFieldErrors(parsed.error),
      safeSignupFieldValues(submittedValues),
    );
  }

  const values = parsed.data;
  const signupSource = resolveSignupSource(formData.get("offer")?.toString());
  const selectedPlan = findPublicPlanBySlug(values.plan);
  const fieldValues = safeSignupFieldValues(values);
  if (!selectedPlan) {
    return formError("Select a valid plan to continue.", { plan: "Choose Solo, Small Office, or Team." }, fieldValues);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: values.ownerEmail },
    select: { id: true },
  });

  const existingWorkspace = await prisma.firm.findFirst({
    where: { name: values.firmName },
    select: { id: true },
  });

  if (existingWorkspace) {
    return formError("That workspace name is already in use. Choose a different name.", {
      firmName: "That workspace name is already used.",
    }, fieldValues);
  }

  if (existingUser) {
    return formError("That owner email is already in use. Sign in or use a different email.", {
      ownerEmail: "That email is already used by an existing account.",
    }, fieldValues);
  }

  let result: Awaited<ReturnType<typeof beginPublicSignup>>;
  try {
    result = await beginPublicSignup({
      planSlug: values.plan,
      firmName: values.firmName,
      ownerName: values.ownerName,
      ownerEmail: values.ownerEmail,
      ownerPhone: values.ownerPhone,
      passwordHash: hashPassword(values.password),
      signupSource,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workspace setup failed.";
    if (message.includes("already exists")) {
      return formError("That owner email is already in use. Sign in or use a different email.", {
        ownerEmail: "That email is already used by an existing account.",
      }, fieldValues);
    }
    if (resolveBillingProvider() === "stripe" && stripeConfigured()) {
      console.warn(`[signup] Stripe Checkout could not be started: ${message}`);
      return formError("Checkout could not be started right now. Please try again.", {}, fieldValues);
    }
    return formError("Workspace setup could not be completed right now. Please try again.", {}, fieldValues);
  }

  if (result.mode === "checkout") {
    if (signupSource === "founding" && canSendSystemEmail()) {
      const notificationResult = await sendTrialSignupAlertEmail({
        workspaceName: values.firmName,
        ownerName: values.ownerName,
        ownerEmail: values.ownerEmail,
        planLabel: selectedPlan.label,
        offerLabel: FOUNDING_OPS_ALERT,
      });

      if (!notificationResult.ok) {
        console.warn(`[signup] Founding checkout alert email not sent: ${notificationResult.error}`);
      }
    }

    redirect(result.url);
  }

  const sessionCreated = await createSessionForUser(result.ownerUserId);
  if (!sessionCreated) {
    return formError("Sign-in is not configured on this environment yet. Add AUTH_SECRET before using self-service signup.");
  }

  // Do not block signup if operator notification email fails.
  if (canSendSystemEmail()) {
    const baseUrl = resolveAppBaseUrl();
    const welcomeResult = await sendWelcomeSignupEmail({
      toEmail: values.ownerEmail,
      userName: values.ownerName,
      startUrl: `${baseUrl}/start`,
      helpUrl: `${baseUrl}/help`,
    });

    if (!welcomeResult.ok) {
      console.warn(`[signup] Welcome email not sent: ${welcomeResult.error}`);
    }

    const notificationResult = await sendTrialSignupAlertEmail({
      workspaceName: values.firmName,
      ownerName: values.ownerName,
      ownerEmail: values.ownerEmail,
      planLabel: selectedPlan.label,
      offerLabel: signupSource === "founding" ? FOUNDING_OPS_ALERT : undefined,
    });

    if (!notificationResult.ok) {
      console.warn(`[signup] Trial signup alert email not sent: ${notificationResult.error}`);
    }
  }

  redirect(withNotice(`/start?signup_plan=${values.plan}`, "self-service-signup-complete"));
}
