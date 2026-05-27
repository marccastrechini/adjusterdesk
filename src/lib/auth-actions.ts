"use server";

import { redirect } from "next/navigation";
import { getDemoContext } from "@/lib/app-context";
import {
  createPasswordResetTokenValue,
  hashPassword,
  hashPasswordResetToken,
  resolveAppBaseUrl,
  resolvePasswordResetTokenMinutes,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
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

export async function requestPasswordResetWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";

  if (!email) {
    return formError("Enter your email address to request a password reset.", {
      email: "Enter your email address.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      active: true,
      email: true,
      name: true,
    },
  });

  if (user && user.active) {
    const token = createPasswordResetTokenValue();
    const tokenHash = hashPasswordResetToken(token);
    const tokenMinutes = resolvePasswordResetTokenMinutes();
    const expiresAt = new Date(Date.now() + tokenMinutes * 60 * 1000);
    const resetUrl = `${resolveAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    const sendResult = await sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetUrl,
      expiresInMinutes: tokenMinutes,
    });

    if (sendResult.ok) {
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    } else {
      console.error(`Password reset email not sent: ${sendResult.error}`);
    }
  }

  redirect(withNotice("/forgot-password", "password-reset-requested"));
}

export async function resetPasswordWithTokenWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const token = formData.get("token")?.toString().trim() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";
  const errors: FieldErrors = {};

  if (!token) {
    return formError("The reset link is missing or invalid. Request a new password reset email.");
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

  if (Object.keys(errors).length > 0) {
    return formError("Fix the password fields and try again.", errors);
  }

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: {
        select: {
          active: true,
        },
      },
    },
  });

  const now = new Date();
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now || !resetToken.user.active) {
    return formError("This reset link is invalid or expired. Request a new password reset email.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const markUsed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

      if (markUsed.count !== 1) {
        throw new Error("reset-token-already-used");
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: hashPassword(newPassword),
        },
      });
    });
  } catch {
    return formError("This reset link is invalid or expired. Request a new password reset email.");
  }

  redirect(withNotice("/login", "password-reset-complete"));
}