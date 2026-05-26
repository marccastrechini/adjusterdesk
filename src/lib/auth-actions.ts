"use server";

import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth";
import { formError, type ActionFormState, type FieldErrors } from "@/lib/form-state";
import { prisma } from "@/lib/prisma";
import { clearSession, createSessionForUser } from "@/lib/session";

export async function loginWithPassword(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const errors: FieldErrors = {};

  if (!email) {
    errors.email = "Enter your email address.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  }

  if (Object.keys(errors).length > 0) {
    return formError("Enter your email and password to sign in.", errors);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      active: true,
      passwordHash: true,
    },
  });

  if (!user || !user.active || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return formError("Invalid email or password. Use an active office user account.", {
      email: "Invalid email or password.",
      password: "Invalid email or password.",
    });
  }

  const sessionCreated = await createSessionForUser(user.id);
  if (!sessionCreated) {
    return formError("Sign-in is not configured on this environment yet. Add AUTH_SECRET before pilot deployment.");
  }

  redirect("/today");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}