import { Resend } from "resend";
import { renderSystemEmailTemplate } from "@/lib/email-template";

type PasswordResetEmailInput = {
  toEmail: string;
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
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

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<EmailSendResult> {
  const provider = resolveEmailProvider();
  if (!provider) {
    return {
      ok: false,
      error: "EMAIL_PROVIDER is not configured.",
    };
  }

  if (provider !== "resend") {
    return {
      ok: false,
      error: `EMAIL_PROVIDER '${provider}' is not supported for password reset emails.`,
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
      footer: "AdjusterDesk system email from hello@adjusterdesk.xyz",
    });

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: resolveSystemEmailFrom(),
      to: [input.toEmail],
      replyTo: resolveSystemEmailReplyTo(),
      subject: "AdjusterDesk password reset",
      html: emailContent.html,
      text: emailContent.text,
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