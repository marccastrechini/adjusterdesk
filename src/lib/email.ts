import { Resend } from "resend";
import { renderSystemEmailTemplate } from "@/lib/email-template";

type PasswordResetEmailInput = {
  toEmail: string;
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

type UserInvitationEmailInput = {
  toEmail: string;
  userName: string;
  workspaceName: string;
  acceptInviteUrl: string;
  expiresInMinutes: number;
};

type TrialSignupAlertEmailInput = {
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  planLabel: string;
};

type WelcomeSignupEmailInput = {
  toEmail: string;
  userName: string;
  startUrl: string;
  helpUrl: string;
};

type EmailSendResult = {
  ok: boolean;
  error?: string;
};

function resolveEmailProvider() {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() ?? "";
}

function resolveSystemEmailFrom() {
  return process.env.SYSTEM_EMAIL_FROM?.trim() || "AdjusterDesk <hello@adjusterdesk.xyz>";
}

function resolveSystemEmailReplyTo() {
  return process.env.SYSTEM_EMAIL_REPLY_TO?.trim() || "hello@adjusterdesk.xyz";
}

function resolveSystemEmailFooter() {
  return `AdjusterDesk system email from ${resolveSystemEmailReplyTo()}`;
}

function getEmailProviderError() {
  const provider = resolveEmailProvider();
  if (!provider) {
    return "EMAIL_PROVIDER is not configured.";
  }

  if (provider !== "resend") {
    return `EMAIL_PROVIDER '${provider}' is not supported for system emails.`;
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return "RESEND_API_KEY is not configured.";
  }

  return undefined;
}

export function canSendSystemEmail() {
  return !getEmailProviderError();
}

async function sendSystemEmail({
  toEmail,
  subject,
  html,
  text,
}: {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailSendResult> {
  const providerError = getEmailProviderError();
  if (providerError) {
    return {
      ok: false,
      error: providerError,
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: resolveSystemEmailFrom(),
      to: [toEmail],
      replyTo: resolveSystemEmailReplyTo(),
      subject,
      html,
      text,
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email provider error.";
    return {
      ok: false,
      error: `Resend send failed: ${message}`,
    };
  }
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailSendResult> {
  const emailContent = renderSystemEmailTemplate({
    preheader: "Reset your AdjusterDesk password.",
    title: "Reset your password",
    intro: `Hello ${input.userName},`,
    bodyLines: [
      "A password reset was requested for your AdjusterDesk account.",
      `Use the button below to set a new password. This link expires in ${input.expiresInMinutes} minutes and can be used once.`,
    ],
    ctaLabel: "Reset password",
    ctaUrl: input.resetUrl,
    secondaryText: "If you did not request this, you can ignore this email.",
    footer: resolveSystemEmailFooter(),
  });

  return sendSystemEmail({
    toEmail: input.toEmail,
    subject: "AdjusterDesk password reset",
    html: emailContent.html,
    text: emailContent.text,
  });
}

export async function sendUserInvitationEmail(input: UserInvitationEmailInput): Promise<EmailSendResult> {
  const emailContent = renderSystemEmailTemplate({
    preheader: "You have been invited to AdjusterDesk.",
    title: "Set up your account",
    intro: `Hello ${input.userName},`,
    bodyLines: [
      `You were invited to join ${input.workspaceName} in AdjusterDesk.`,
      `Use the secure link below to set your password. This invite expires in ${input.expiresInMinutes} minutes and can be used once.`,
    ],
    ctaLabel: "Accept invite",
    ctaUrl: input.acceptInviteUrl,
    secondaryText: "If you were not expecting this invite, you can ignore this email.",
    footer: resolveSystemEmailFooter(),
  });

  return sendSystemEmail({
    toEmail: input.toEmail,
    subject: "AdjusterDesk account invitation",
    html: emailContent.html,
    text: emailContent.text,
  });
}

export async function sendTrialSignupAlertEmail(input: TrialSignupAlertEmailInput): Promise<EmailSendResult> {
  const toEmail = process.env.SYSTEM_ADMIN_EMAIL?.trim();
  if (!toEmail) {
    return {
      ok: false,
      error: "SYSTEM_ADMIN_EMAIL is not configured.",
    };
  }

  const emailContent = renderSystemEmailTemplate({
    preheader: "A new AdjusterDesk trial workspace was created.",
    title: "New trial signup",
    intro: "A new workspace was created from the public signup form.",
    bodyLines: [
      `Workspace: ${input.workspaceName}`,
      `Owner: ${input.ownerName}`,
      `Owner email: ${input.ownerEmail}`,
      `Plan selected: ${input.planLabel}`,
    ],
    secondaryText: "Sign in to system workspaces to review the new office and follow up.",
    footer: resolveSystemEmailFooter(),
  });

  return sendSystemEmail({
    toEmail,
    subject: "AdjusterDesk new trial signup",
    html: emailContent.html,
    text: emailContent.text,
  });
}

export async function sendWelcomeSignupEmail(input: WelcomeSignupEmailInput): Promise<EmailSendResult> {
  const emailContent = renderSystemEmailTemplate({
    preheader: "Welcome to AdjusterDesk. Start with your first claim in the first five minutes.",
    title: "Welcome to AdjusterDesk",
    intro: `Hello ${input.userName},`,
    bodyLines: [
      "Welcome to AdjusterDesk. It is built for solo and small public adjusting offices.",
      "Start with these three steps:",
      "1. Add your first lead or claim.",
      "2. Add the next follow-up.",
      "3. Open Today to see what needs attention.",
      "Use Start for a quick walkthrough, and Help for practical how-to guidance.",
    ],
    ctaLabel: "Open Start",
    ctaUrl: input.startUrl,
    secondaryText: `Need guidance? Open ${input.helpUrl}`,
    footer: resolveSystemEmailFooter(),
  });

  return sendSystemEmail({
    toEmail: input.toEmail,
    subject: "Welcome to AdjusterDesk - start with your first claim",
    html: emailContent.html,
    text: emailContent.text,
  });
}