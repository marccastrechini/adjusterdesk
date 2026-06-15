import { renderSystemEmailTemplate } from "@/lib/email-template";

export type EmailAudience = "customer" | "internal";

export type SystemEmailTemplateDescriptor = {
  id: string;
  name: string;
  description: string;
  audience: EmailAudience;
  from: string;
  replyTo: string;
  subject: string;
  sampleDataLabels: Record<string, string>;
  html: string;
  text: string;
};

function resolveFrom() {
  return process.env.SYSTEM_EMAIL_FROM?.trim() || "AdjusterDesk <hello@adjusterdesk.xyz>";
}

function resolveReplyTo() {
  return process.env.SYSTEM_EMAIL_REPLY_TO?.trim() || "hello@adjusterdesk.xyz";
}

function footer() {
  return `AdjusterDesk system email from ${resolveReplyTo()}`;
}

export function getSystemEmailTemplates(): SystemEmailTemplateDescriptor[] {
  const from = resolveFrom();
  const replyTo = resolveReplyTo();

  const passwordReset = renderSystemEmailTemplate({
    preheader: "Reset your AdjusterDesk password.",
    title: "Reset your password",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      "A password reset was requested for your AdjusterDesk account.",
      "Use the button below to set a new password. This link expires in 60 minutes and can be used once.",
    ],
    ctaLabel: "Reset password",
    ctaUrl: "https://adjusterdesk.xyz/reset-password?token=sample-token",
    secondaryText: "If you did not request this, you can ignore this email.",
    footer: footer(),
  });

  const userInvitation = renderSystemEmailTemplate({
    preheader: "You have been invited to AdjusterDesk.",
    title: "Set up your account",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      "You were invited to join Sample Adjusting Co in AdjusterDesk.",
      "Use the secure link below to set your password. This invite expires in 60 minutes and can be used once.",
    ],
    ctaLabel: "Accept invite",
    ctaUrl: "https://adjusterdesk.xyz/accept-invite?token=sample-token",
    secondaryText: "If you were not expecting this invite, you can ignore this email.",
    footer: footer(),
  });

  const trialSignupAlert = renderSystemEmailTemplate({
    preheader: "A new AdjusterDesk trial workspace was created.",
    title: "New trial signup",
    intro: "A new workspace was created from the public signup form.",
    bodyLines: [
      "Workspace: Sample Adjusting Co",
      "Owner: Alex Johnson",
      "Owner email: alex@example.com",
      "Plan selected: Solo",
    ],
    secondaryText: "Sign in to system workspaces to review the new office and follow up.",
    footer: footer(),
  });

  const welcomeSignup = renderSystemEmailTemplate({
    preheader: "Welcome to AdjusterDesk. Start with your first claim in the first five minutes.",
    title: "Welcome to AdjusterDesk",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      "Welcome to AdjusterDesk. It is built for solo and small public adjusting offices.",
      "Start with these three steps:",
      "1. Add your first lead or claim.",
      "2. Add the next follow-up.",
      "3. Open Today to see what needs attention.",
      "Use Start for a quick walkthrough, and Help for practical how-to guidance.",
    ],
    ctaLabel: "Open Start",
    ctaUrl: "https://adjusterdesk.xyz/start",
    secondaryText: "Need guidance? Open https://adjusterdesk.xyz/help",
    footer: footer(),
  });

  return [
    {
      id: "password_reset",
      name: "Password reset",
      description: "Sent when a user requests a password reset link.",
      audience: "customer",
      from,
      replyTo,
      subject: "AdjusterDesk password reset",
      sampleDataLabels: {
        userName: "Alex Johnson",
        resetUrl: "https://adjusterdesk.xyz/reset-password?token=sample-token",
        expiresInMinutes: "60",
      },
      html: passwordReset.html,
      text: passwordReset.text,
    },
    {
      id: "user_invitation",
      name: "User invitation",
      description: "Sent to a new user when they are invited to join a workspace.",
      audience: "customer",
      from,
      replyTo,
      subject: "AdjusterDesk account invitation",
      sampleDataLabels: {
        userName: "Alex Johnson",
        workspaceName: "Sample Adjusting Co",
        acceptInviteUrl: "https://adjusterdesk.xyz/accept-invite?token=sample-token",
        expiresInMinutes: "60",
      },
      html: userInvitation.html,
      text: userInvitation.text,
    },
    {
      id: "trial_signup_alert",
      name: "Trial signup alert",
      description: "Sent to the system admin when a new trial workspace is created.",
      audience: "internal",
      from,
      replyTo,
      subject: "AdjusterDesk new trial signup",
      sampleDataLabels: {
        workspaceName: "Sample Adjusting Co",
        ownerName: "Alex Johnson",
        ownerEmail: "alex@example.com",
        planLabel: "Solo",
      },
      html: trialSignupAlert.html,
      text: trialSignupAlert.text,
    },
    {
      id: "welcome_signup",
      name: "Welcome signup",
      description: "Sent to the workspace owner after a successful self-service signup.",
      audience: "customer",
      from,
      replyTo,
      subject: "Welcome to AdjusterDesk - start with your first claim",
      sampleDataLabels: {
        userName: "Alex Johnson",
        startUrl: "https://adjusterdesk.xyz/start",
        helpUrl: "https://adjusterdesk.xyz/help",
      },
      html: welcomeSignup.html,
      text: welcomeSignup.text,
    },
  ];
}
