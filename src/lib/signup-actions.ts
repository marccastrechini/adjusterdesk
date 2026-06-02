"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import {
  findPublicPlanBySlug,
  publicSelfServiceReady,
  resolveBillingProvider,
  stripeConfigured,
  type PublicPlanSlug,
} from "@/lib/billing";
import { formError, type ActionFormState, type FieldErrors } from "@/lib/form-state";
import { withNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { createSessionForUser } from "@/lib/session";
import {
  createSignupIntent,
  createStripeCheckoutSessionForIntent,
  markSignupIntentCanceled,
  provisionManualSignup,
} from "@/lib/signup";

const signupSchema = z
  .object({
    plan: z.enum(["solo", "small-office", "team"]),
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

export async function startSignupWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  if (!publicSelfServiceReady()) {
    return formError("Your selected plan and workspace details are saved first. We will confirm setup before billing begins.");
  }

  const parsed = signupSchema.safeParse({
    plan: formData.get("plan")?.toString(),
    firmName: formData.get("firmName")?.toString() ?? "",
    ownerName: formData.get("ownerName")?.toString() ?? "",
    ownerEmail: formData.get("ownerEmail")?.toString() ?? "",
    ownerPhone: formData.get("ownerPhone")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    agreedToTerms: parseAgreement(formData),
  });

  if (!parsed.success) {
    return formError("Fix the highlighted fields and try again.", zodToFieldErrors(parsed.error));
  }

  const values = parsed.data;
  const selectedPlan = findPublicPlanBySlug(values.plan);
  if (!selectedPlan) {
    return formError("Select a valid plan to continue.", { plan: "Choose Solo, Small Office, or Team." });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: values.ownerEmail },
    select: { id: true },
  });

  if (existingUser) {
    return formError("That owner email is already in use. Sign in or use a different email.", {
      ownerEmail: "That email is already used by an existing account.",
    });
  }

  const pendingIntent = await prisma.signupIntent.findFirst({
    where: {
      ownerEmail: values.ownerEmail,
      status: {
        in: ["PENDING", "CHECKOUT_COMPLETED"],
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (pendingIntent) {
    await markSignupIntentCanceled(pendingIntent.id);
  }

  const intent = await createSignupIntent({
    planSlug: values.plan as PublicPlanSlug,
    firmName: values.firmName,
    ownerName: values.ownerName,
    ownerEmail: values.ownerEmail,
    ownerPhone: values.ownerPhone,
    passwordHash: hashPassword(values.password),
  });

  const billingProvider = resolveBillingProvider();

  if (billingProvider === "stripe") {
    if (!stripeConfigured()) {
      await markSignupIntentCanceled(intent.id);
      return formError("Billing setup is still being finalized. Your plan selection was saved and we will confirm setup before billing begins.");
    }

    const checkoutSession = await createStripeCheckoutSessionForIntent(intent.id, values.plan as PublicPlanSlug);
    if (!checkoutSession.url) {
      return formError("Workspace setup could not continue right now. Please try again.");
    }

    redirect(checkoutSession.url);
  }

  const result = await provisionManualSignup(intent.id);
  const sessionCreated = await createSessionForUser(result.ownerUserId);

  if (!sessionCreated) {
    return formError("Sign-in is not configured on this environment yet. Add AUTH_SECRET before using self-service signup.");
  }

  redirect(withNotice("/start", "self-service-signup-complete"));
}
