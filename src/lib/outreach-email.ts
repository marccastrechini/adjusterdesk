import { OutreachActivityStatus, OutreachActivityType, OutreachProspectStatus } from "@/generated/prisma/client";
import { sendDirectEmail } from "@/lib/email";
import { applyOutreachEmailTaskRules } from "@/lib/outreach-tasks";
import { prisma } from "@/lib/prisma";
import { freeClaimTrackerUrl, trialSignupUrl } from "@/lib/outreach";

const outreachTemplateCatalog = [
  {
    key: "outreach_first_email",
    label: "Outreach first email",
    description: "Practical first outreach with free claim tracker and first-10-claims context.",
    subject: "Free claim tracker for {{firmName}}",
    body: [
      "Hi {{contactNameOrFallback}},",
      "",
      "I work with small public adjusting offices and wanted to share a free claim tracker that may be useful for {{firmName}}.",
      "",
      "Free claim tracker: {{claimTrackerLink}}",
      "",
      "I am also getting feedback on a simple workspace for managing the first 10 claims without scattered folders or missed follow-ups.",
      "If useful, trial signup is here: {{trialSignupLink}}",
      "If you are open to it, I would value a quick reply with what your office would want most.",
      "",
      "Thanks,",
      "{{operatorNameOrAdjusterDesk}}",
      "{{operatorEmailLine}}",
    ].join("\n"),
  },
  {
    key: "outreach_follow_up",
    label: "Outreach follow-up",
    description: "Low-pressure follow-up with claim tracker and trial link.",
    subject: "Quick follow-up for {{firmName}}",
    body: [
      "Hi {{contactNameOrFallback}},",
      "",
      "Quick follow-up in case my last note got buried.",
      "",
      "Free claim tracker: {{claimTrackerLink}}",
      "",
      "If helpful, here is the simple workspace trial for the first 10 claims:",
      "{{trialSignupLink}}",
      "",
      "No pressure at all. If now is not a good time, I can follow up later.",
      "",
      "Thanks,",
      "{{operatorNameOrAdjusterDesk}}",
      "{{operatorEmailLine}}",
    ].join("\n"),
  },
] as const;

export type OutreachEmailTemplateKey = (typeof outreachTemplateCatalog)[number]["key"];

export const outreachEmailTemplateOptions = outreachTemplateCatalog.map((template) => ({
  key: template.key,
  label: template.label,
  description: template.description,
}));

const outreachTemplateKeySet = new Set(outreachTemplateCatalog.map((template) => template.key));

export function isOutreachEmailTemplateKey(value: string): value is OutreachEmailTemplateKey {
  return outreachTemplateKeySet.has(value as OutreachEmailTemplateKey);
}

function replaceTokens(source: string, variables: Record<string, string>) {
  let result = source;
  for (const [token, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${token}}}`, value);
  }
  return result;
}

function trimBlankLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, all) => !(line.length === 0 && all[index - 1]?.length === 0))
    .join("\n")
    .trim();
}

type OutreachTemplateRenderInput = {
  templateKey: OutreachEmailTemplateKey;
  prospectFirmName: string;
  prospectContactName?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
};

export function renderOutreachEmailTemplate(input: OutreachTemplateRenderInput) {
  const template = outreachTemplateCatalog.find((candidate) => candidate.key === input.templateKey);
  if (!template) {
    return null;
  }

  const safeOperatorName = input.operatorName?.trim() || "AdjusterDesk";
  const safeOperatorEmail = input.operatorEmail?.trim() || "";

  const variables: Record<string, string> = {
    firmName: input.prospectFirmName.trim() || "your office",
    contactNameOrFallback: input.prospectContactName?.trim() || "there",
    operatorNameOrAdjusterDesk: safeOperatorName,
    operatorEmail: safeOperatorEmail,
    operatorEmailLine: safeOperatorEmail ? safeOperatorEmail : "",
    claimTrackerLink: freeClaimTrackerUrl,
    trialSignupLink: trialSignupUrl,
  };

  return {
    templateKey: template.key,
    templateLabel: template.label,
    subject: trimBlankLines(replaceTokens(template.subject, variables)),
    body: trimBlankLines(replaceTokens(template.body, variables)),
  };
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

function parseSystemFrom() {
  const configured = process.env.SYSTEM_EMAIL_FROM?.trim() || "AdjusterDesk <hello@adjusterdesk.xyz>";
  const email = extractEmailAddress(configured);
  if (email === "admin@adjusterdesk.xyz") {
    return {
      from: "AdjusterDesk <hello@adjusterdesk.xyz>",
      fromEmail: "hello@adjusterdesk.xyz",
    };
  }
  return {
    from: configured,
    fromEmail: email,
  };
}

function parseSystemReplyTo() {
  const configured = (process.env.SYSTEM_EMAIL_REPLY_TO?.trim() || "hello@adjusterdesk.xyz").toLowerCase();
  if (configured === "admin@adjusterdesk.xyz") {
    return "hello@adjusterdesk.xyz";
  }
  return configured;
}

function canUseOperatorFromAddress() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const allow = process.env.OUTREACH_ALLOW_OPERATOR_FROM?.trim().toLowerCase() === "true";
  return provider === "resend" && allow;
}

function isAllowedOperatorAddress(value?: string | null) {
  if (!value) return false;
  const email = value.trim().toLowerCase();
  return email.endsWith("@adjusterdesk.xyz") && email !== "admin@adjusterdesk.xyz";
}

function formatFromName(name: string | undefined, email: string) {
  const safeName = name?.trim();
  if (!safeName) return email;
  return `${safeName} <${email}>`;
}

export type OutreachSenderResolution = {
  from: string;
  fromEmail: string;
  replyTo: string;
  replyToEmail: string;
  usingOperatorFrom: boolean;
  usingOperatorReplyTo: boolean;
  supportsOperatorFrom: boolean;
  note: string;
};

export function resolveOutreachSenderPolicy(input: { userName?: string | null; userEmail?: string | null }): OutreachSenderResolution {
  const systemFrom = parseSystemFrom();
  const systemReplyTo = parseSystemReplyTo();
  const operatorEmail = input.userEmail?.trim().toLowerCase();
  const operatorAllowed = isAllowedOperatorAddress(operatorEmail);
  const operatorFromSupported = canUseOperatorFromAddress();

  const useOperatorFrom = Boolean(operatorAllowed && operatorFromSupported && operatorEmail);
  const useOperatorReplyTo = Boolean(operatorAllowed && operatorEmail);

  const fromEmail = useOperatorFrom && operatorEmail ? operatorEmail : systemFrom.fromEmail;
  const from = useOperatorFrom && operatorEmail ? formatFromName(input.userName ?? undefined, operatorEmail) : systemFrom.from;
  const replyToEmail = useOperatorReplyTo && operatorEmail ? operatorEmail : systemReplyTo;

  const note = useOperatorFrom
    ? "From and Reply-To use the outreach operator mailbox."
    : useOperatorReplyTo
      ? "From uses the configured system sender. Replies go to the outreach operator mailbox."
      : "From and Reply-To use the configured system sender fallback.";

  return {
    from,
    fromEmail,
    replyTo: replyToEmail,
    replyToEmail,
    usingOperatorFrom: useOperatorFrom,
    usingOperatorReplyTo: useOperatorReplyTo,
    supportsOperatorFrom: operatorFromSupported,
    note,
  };
}

function toSimpleHtml(body: string) {
  const escaped = body
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const paragraphHtml = escaped
    .split("\n\n")
    .map((block) => `<p style=\"margin: 0 0 12px; color: #334155; font-size: 14px; line-height: 1.6;\">${block.replaceAll("\n", "<br />")}</p>`)
    .join("");

  return `<!doctype html><html><body style=\"font-family: Arial, Helvetica, sans-serif; background: #f8fafc; padding: 24px;\"><div style=\"max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;\"><p style=\"margin: 0 0 14px; color: #0f766e; font-size: 13px; font-weight: 700;\">AdjusterDesk Outreach</p>${paragraphHtml}</div></body></html>`;
}

function addBusinessDays(date: Date, businessDays: number) {
  const value = new Date(date);
  let remaining = businessDays;
  while (remaining > 0) {
    value.setUTCDate(value.getUTCDate() + 1);
    const day = value.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return value;
}

type SendOutreachTemplateInput = {
  outreachProspectId: string;
  templateKey: OutreachEmailTemplateKey;
  actor: {
    id: string;
    name: string;
    email: string;
  };
};

type SendOutreachTemplateResult =
  | {
      ok: true;
      statusUpdated: OutreachProspectStatus | null;
      messageId?: string;
      sender: OutreachSenderResolution;
    }
  | {
      ok: false;
      errorCode: "missing" | "template" | "email" | "recipient" | "provider";
      errorMessage: string;
    };

type OutreachPrismaLike = {
  outreachProspect: {
    findUnique: typeof prisma.outreachProspect.findUnique;
    update: typeof prisma.outreachProspect.update;
  };
  outreachActivity: {
    create: typeof prisma.outreachActivity.create;
  };
  outreachTask: {
    findFirst: typeof prisma.outreachTask.findFirst;
    findMany: typeof prisma.outreachTask.findMany;
    create: typeof prisma.outreachTask.create;
    updateMany: typeof prisma.outreachTask.updateMany;
  };
};

type DirectEmailResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
};

type SendOutreachOptions = {
  now?: Date;
  prismaClient?: OutreachPrismaLike;
  sendEmail?: (input: {
    from: string;
    toEmail: string;
    replyTo: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<DirectEmailResult>;
};

export async function sendOutreachTemplateEmail(input: SendOutreachTemplateInput, options: SendOutreachOptions = {}): Promise<SendOutreachTemplateResult> {
  const prismaClient = options.prismaClient ?? (prisma as OutreachPrismaLike);
  const sendEmail = options.sendEmail ?? sendDirectEmail;
  const now = options.now ?? new Date();

  const prospect = await prismaClient.outreachProspect.findUnique({
    where: { id: input.outreachProspectId },
    select: {
      id: true,
      firmName: true,
      contactName: true,
      email: true,
      status: true,
      dateContacted: true,
      followUpDate: true,
    },
  });

  if (!prospect) {
    return { ok: false, errorCode: "missing", errorMessage: "Prospect not found." };
  }

  if (!prospect.email?.trim()) {
    return { ok: false, errorCode: "email", errorMessage: "No public email on this prospect." };
  }

  const recipientEmail = prospect.email.trim().toLowerCase();
  const validRecipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
  if (!validRecipient) {
    return { ok: false, errorCode: "recipient", errorMessage: "Prospect email is not valid." };
  }

  const rendered = renderOutreachEmailTemplate({
    templateKey: input.templateKey,
    prospectFirmName: prospect.firmName,
    prospectContactName: prospect.contactName,
    operatorName: input.actor.name,
    operatorEmail: input.actor.email,
  });

  if (!rendered) {
    return { ok: false, errorCode: "template", errorMessage: "Selected outreach template is not valid." };
  }

  const sender = resolveOutreachSenderPolicy({ userName: input.actor.name, userEmail: input.actor.email });
  if (sender.fromEmail === "admin@adjusterdesk.xyz" || sender.replyToEmail === "admin@adjusterdesk.xyz") {
    return { ok: false, errorCode: "provider", errorMessage: "Outreach sender policy rejected admin mailbox usage." };
  }

  const sendResult = await sendEmail({
    from: sender.from,
    toEmail: recipientEmail,
    replyTo: sender.replyTo,
    subject: rendered.subject,
    text: rendered.body,
    html: toSimpleHtml(rendered.body),
  });

  if (!sendResult.ok) {
    await prismaClient.outreachActivity.create({
      data: {
        outreachProspectId: prospect.id,
        type: OutreachActivityType.EMAIL,
        status: OutreachActivityStatus.FAILED,
        subject: rendered.subject,
        bodySnapshot: rendered.body.slice(0, 2000),
        recipientEmail,
        fromEmail: sender.fromEmail,
        replyToEmail: sender.replyToEmail,
        templateKey: rendered.templateKey,
        errorMessage: sendResult.error ?? "Provider send failed.",
        createdByUserId: input.actor.id,
      },
    });

    return {
      ok: false,
      errorCode: "provider",
      errorMessage: sendResult.error ?? "Provider send failed.",
    };
  }

  const prospectUpdate: {
    status?: OutreachProspectStatus;
    dateContacted?: Date;
    followUpDate?: Date;
  } = {};

  if (input.templateKey === "outreach_first_email") {
    prospectUpdate.status = OutreachProspectStatus.CONTACTED;
    if (!prospect.dateContacted) {
      prospectUpdate.dateContacted = now;
    }
    if (!prospect.followUpDate) {
      prospectUpdate.followUpDate = addBusinessDays(now, 4);
    }
  }

  await prismaClient.outreachProspect.update({
    where: { id: prospect.id },
    data: prospectUpdate,
  });

  await prismaClient.outreachActivity.create({
    data: {
      outreachProspectId: prospect.id,
      type: OutreachActivityType.EMAIL,
      status: OutreachActivityStatus.SENT,
      subject: rendered.subject,
      bodySnapshot: rendered.body.slice(0, 2000),
      recipientEmail,
      fromEmail: sender.fromEmail,
      replyToEmail: sender.replyToEmail,
      templateKey: rendered.templateKey,
      providerMessageId: sendResult.messageId,
      createdByUserId: input.actor.id,
    },
  });

  await applyOutreachEmailTaskRules({
    outreachProspectId: prospect.id,
    templateKey: input.templateKey,
    now,
    assignedToUserId: input.actor.id,
    prismaClient,
  });

  return {
    ok: true,
    statusUpdated: prospectUpdate.status ?? null,
    messageId: sendResult.messageId,
    sender,
  };
}

export function getOutreachTemplatePreviewDescriptors() {
  const fallbackFrom = parseSystemFrom().from;
  const fallbackReplyTo = parseSystemReplyTo();

  return outreachTemplateCatalog.map((template) => {
    const rendered = renderOutreachEmailTemplate({
      templateKey: template.key,
      prospectFirmName: "Sample Public Adjusting",
      prospectContactName: "Jordan",
      operatorName: "Outreach Operator",
      operatorEmail: "operator@adjusterdesk.xyz",
    });

    return {
      id: template.key,
      name: template.label,
      description: `${template.description} (Outreach manual send template)` ,
      audience: "customer" as const,
      from: fallbackFrom,
      replyTo: `operator@adjusterdesk.xyz (fallback: ${fallbackReplyTo})`,
      subject: rendered?.subject ?? template.subject,
      sampleDataLabels: {
        contactName: "Jordan",
        firmName: "Sample Public Adjusting",
        operatorName: "Outreach Operator",
        operatorEmail: "operator@adjusterdesk.xyz",
        claimTrackerLink: freeClaimTrackerUrl,
        trialSignupLink: trialSignupUrl,
      },
      html: toSimpleHtml(rendered?.body ?? template.body),
      text: rendered?.body ?? template.body,
    };
  });
}
