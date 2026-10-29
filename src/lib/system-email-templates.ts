import { renderFeedbackOwnerEmail } from "@/lib/email";
import { renderSystemEmailTemplate } from "@/lib/email-template";
import { getOutreachTemplatePreviewDescriptors } from "@/lib/outreach-email";
import { brandName, canonicalOrigin, resolveBrandFromHeader, resolveBrandReplyTo } from "@/lib/brand";
import { FOUNDING_HONESTY_NOTE, FOUNDING_ONBOARDING, FOUNDING_PRICE_LINE, FOUNDING_STANDARD_COMPARE } from "@/lib/founding-offer";

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
  return resolveBrandFromHeader(process.env.SYSTEM_EMAIL_FROM).from;
}

function resolveReplyTo() {
  return resolveBrandReplyTo(process.env.SYSTEM_EMAIL_REPLY_TO);
}

function footer() {
  return `${brandName} system email from ${resolveReplyTo()}`;
}

export function getSystemEmailTemplates(): SystemEmailTemplateDescriptor[] {
  const from = resolveFrom();
  const replyTo = resolveReplyTo();

  const passwordReset = renderSystemEmailTemplate({
    preheader: `Reset your ${brandName} password.`,
    title: "Reset your password",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      `A password reset was requested for your ${brandName} account.`,
      "Use the button below to set a new password. This link expires in 60 minutes and can be used once.",
    ],
    ctaLabel: "Reset password",
    ctaUrl: `${canonicalOrigin}/reset-password?token=sample-token`,
    secondaryText: "If you did not request this, you can ignore this email.",
    footer: footer(),
  });

  const userInvitation = renderSystemEmailTemplate({
    preheader: `You have been invited to ${brandName}.`,
    title: "Set up your account",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      `You were invited to join Sample Adjusting Co in ${brandName}.`,
      "Use the secure link below to set your password. This invite expires in 60 minutes and can be used once.",
    ],
    ctaLabel: "Accept invite",
    ctaUrl: `${canonicalOrigin}/accept-invite?token=sample-token`,
    secondaryText: "If you were not expecting this invite, you can ignore this email.",
    footer: footer(),
  });

  const trialSignupAlert = renderSystemEmailTemplate({
    preheader: `A new ${brandName} trial workspace was created.`,
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

  const feedbackOwner = renderFeedbackOwnerEmail({
    firmName: "Sample Adjusting Co",
    submitterName: "Alex Johnson",
    submitterEmail: "alex@example.com",
    page: "Claim documents",
    rating: 3,
    message: "The document request list is hard to scan on a phone.",
    reviewUrl: `${canonicalOrigin}/system/feedback`,
  });

  const welcomeSignup = renderSystemEmailTemplate({
    preheader: `Welcome to ${brandName}. Start with your first claim in the first five minutes.`,
    title: `Welcome to ${brandName}`,
    intro: "Hello Alex Johnson,",
    bodyLines: [
      `Welcome to ${brandName}. It is built for solo and small public adjusting offices.`,
      "Start with these three steps:",
      "1. Add your first lead or claim.",
      "2. Add the next follow-up.",
      "3. Open Today to see what needs attention.",
      "Use Start for a quick walkthrough, and Help for practical how-to guidance.",
    ],
    ctaLabel: "Open Start",
    ctaUrl: `${canonicalOrigin}/start`,
    secondaryText: `Need guidance? Open ${canonicalOrigin}/help`,
    footer: footer(),
  });

  const trackerNurtureEmail1 = renderSystemEmailTemplate({
    preheader: "Your free public adjuster claim tracker is ready.",
    title: "Your free claim tracker is ready",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      "Here is your free public adjuster claim tracker.",
      "Use it right away: add your active claims, set the next follow-up date, and mark missing documents.",
      `When the spreadsheet starts becoming too manual, ${brandName} gives you the same structure in a shared workspace.`,
    ],
    ctaLabel: "Download free tracker",
    ctaUrl: `${canonicalOrigin}/free-public-adjuster-claim-tracker`,
    secondaryText: "Questions? Reply to this email and we will help.",
    footer: footer(),
  });

  const trackerNurtureEmail2 = renderSystemEmailTemplate({
    preheader: "Where claim spreadsheets usually start to break down.",
    title: "Where spreadsheets start to break down",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      "Spreadsheets work for getting started, but follow-ups, deadlines, documents, and payment tracking become harder as claim volume grows.",
      "Most small offices notice this around 10 to 15 active claims, especially when more than one person is helping.",
      `${brandName} keeps the same practical claim structure, just in a shared workspace that is easier to manage day to day.`,
    ],
    ctaLabel: "Start free trial",
    ctaUrl: `${canonicalOrigin}/signup`,
    secondaryText: "Not ready yet? Keep using the free tracker and reply by email if you want practical guidance.",
    footer: footer(),
  });

  const trackerNurtureEmail3 = renderSystemEmailTemplate({
    preheader: "First 10 founding offices: $0 for 90 days, then $29/month Solo or $49/month Small Office.",
    title: "Put the first 10 active claims on the desk",
    intro: "Hello Alex Johnson,",
    bodyLines: [
      `If follow-ups, documents, and fees are slipping across email and files, start ${brandName} with your first 10 active claims.`,
      `${FOUNDING_PRICE_LINE} ${FOUNDING_STANDARD_COMPARE}`,
      `${FOUNDING_HONESTY_NOTE} ${FOUNDING_ONBOARDING}`,
    ],
    ctaLabel: "See founding desk offer",
    ctaUrl: `${canonicalOrigin}/founding-public-adjuster-offices`,
    secondaryText: "Prefer a sheet for now? The tracker page is still available.",
    footer: footer(),
  });

  const systemTemplates: SystemEmailTemplateDescriptor[] = [
    {
      id: "password_reset",
      name: "Password reset",
      description: "Sent when a user requests a password reset link.",
      audience: "customer",
      from,
      replyTo,
      subject: `${brandName} password reset`,
      sampleDataLabels: {
        userName: "Alex Johnson",
        resetUrl: `${canonicalOrigin}/reset-password?token=sample-token`,
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
      subject: `${brandName} account invitation`,
      sampleDataLabels: {
        userName: "Alex Johnson",
        workspaceName: "Sample Adjusting Co",
        acceptInviteUrl: `${canonicalOrigin}/accept-invite?token=sample-token`,
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
      subject: `${brandName} new trial signup`,
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
      id: "feedback_owner",
      name: "Office feedback",
      description: "Sent to the system admin when someone submits workspace feedback.",
      audience: "internal",
      from,
      replyTo,
      subject: feedbackOwner.subject,
      sampleDataLabels: {
        firmName: "Sample Adjusting Co",
        submitterName: "Alex Johnson",
        submitterEmail: "alex@example.com",
        page: "Claim documents",
        rating: "3/5",
        reviewUrl: `${canonicalOrigin}/system/feedback`,
      },
      html: feedbackOwner.html,
      text: feedbackOwner.text,
    },
    {
      id: "welcome_signup",
      name: "Welcome signup",
      description: "Sent to the workspace owner after a successful self-service signup.",
      audience: "customer",
      from,
      replyTo,
      subject: `Welcome to ${brandName} - start with your first claim`,
      sampleDataLabels: {
        userName: "Alex Johnson",
        startUrl: `${canonicalOrigin}/start`,
        helpUrl: `${canonicalOrigin}/help`,
      },
      html: welcomeSignup.html,
      text: welcomeSignup.text,
    },
    {
      id: "tracker_nurture_email_1",
      name: "Tracker nurture email 1",
      description: "Tracker delivery email with immediate setup guidance.",
      audience: "customer",
      from,
      replyTo,
      subject: "Your free public adjuster claim tracker is ready",
      sampleDataLabels: {
        userName: "Alex Johnson",
        trackerUrl: `${canonicalOrigin}/free-public-adjuster-claim-tracker`,
      },
      html: trackerNurtureEmail1.html,
      text: trackerNurtureEmail1.text,
    },
    {
      id: "tracker_nurture_email_2",
      name: "Tracker nurture email 2",
      description: "Educational follow-up about spreadsheet limits and low-touch next step.",
      audience: "customer",
      from,
      replyTo,
      subject: "This is where spreadsheets start to break down",
      sampleDataLabels: {
        userName: "Alex Johnson",
        signupUrl: `${canonicalOrigin}/signup`,
      },
      html: trackerNurtureEmail2.html,
      text: trackerNurtureEmail2.text,
    },
    {
      id: "tracker_nurture_email_3",
      name: "Tracker nurture email 3",
      description: `Invite to try ${brandName} with first 10 active claims during feedback period.`,
      audience: "customer",
      from,
      replyTo,
      subject: `Try ${brandName} with your first 10 active claims`,
      sampleDataLabels: {
        userName: "Alex Johnson",
        foundingUrl: `${canonicalOrigin}/founding-public-adjuster-offices`,
      },
      html: trackerNurtureEmail3.html,
      text: trackerNurtureEmail3.text,
    },
  ];

  const outreachTemplates = getOutreachTemplatePreviewDescriptors();

  return [...systemTemplates, ...outreachTemplates];
}
