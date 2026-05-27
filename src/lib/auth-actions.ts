"use server";

import { redirect } from "next/navigation";
import { getDemoContext } from "@/lib/app-context";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { formError, type ActionFormState, type FieldErrors } from "@/lib/form-state";
import { withNotice } from "@/lib/notices";
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

export async function changeOwnPasswordWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const { user } = await getDemoContext();
  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";
  const errors: FieldErrors = {};

  if (!currentPassword) {
    errors.currentPassword = "Enter your current password.";
  }

  if (!newPassword) {
    errors.newPassword = "Enter a new password.";
  } else if (newPassword.length < 8) {
    errors.newPassword = "Use at least 8 characters for the new password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (newPassword && confirmPassword !== newPassword) {
    errors.confirmPassword = "New password and confirmation must match.";
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword = "Choose a new password that is different from the current password.";
  }

  if (Object.keys(errors).length > 0) {
    return formError("Fix the password fields and try again.", errors);
  }

  const currentUser = await prisma.user.findFirst({
    where: {
      id: user.id,
      firmId: user.firmId,
      active: true,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!currentUser || !currentUser.passwordHash || !verifyPassword(currentPassword, currentUser.passwordHash)) {
    return formError("Current password is incorrect.", {
      currentPassword: "Current password is incorrect.",
    });
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      passwordHash: hashPassword(newPassword),
    },
  });

  redirect(withNotice("/settings/account", "password-changed"));
}