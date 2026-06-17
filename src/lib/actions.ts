"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ActivityType,
  ClaimStatus,
  DocumentCategory,
  DocumentRequestStatus,
  InvoiceStatus,
  OutreachActivityStatus,
  OutreachActivityType,
  LeadStatus,
  OutreachProspectStatus,
  OutreachTaskStatus,
  OutreachTaskType,
  SettlementStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  TaskPriority,
  TaskStatus,
  TemplateType,
  UserRole,
} from "@/generated/prisma/client";
import { getDemoContext, requireSystemAdminContext, requireSystemOutreachContext } from "@/lib/app-context";
import {
  createPasswordResetTokenValue,
  hashPassword,
  hashPasswordResetToken,
  resolveAppBaseUrl,
  resolveUserInvitationTokenMinutes,
} from "@/lib/auth";
import { canSendSystemEmail, sendUserInvitationEmail } from "@/lib/email";
import { isOutreachEmailTemplateKey, sendOutreachTemplateEmail } from "@/lib/outreach-email";
import { applyOutreachStatusTaskRules } from "@/lib/outreach-tasks";
import { validateManualActivityInput } from "@/lib/activity-log";
import { clientStatusUploadMarker, validateClientStatusUpdateInput } from "@/lib/client-status";
import { documentRequestResolution, validateClientStatusUploadInput, validateDocumentCreateInput } from "@/lib/document-requests";
import { formError, type ActionFormState, type FieldErrors } from "@/lib/form-state";
import { withNotice } from "@/lib/notices";
import { canAddActiveUser, defaultIncludedUserLimit, resolveIncludedUserLimit } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { generateClientStatusToken } from "@/lib/status-links";
import { saveUploadedFile, validateUploadFile } from "@/lib/storage";
import { clearAdminWorkspaceOverride, setAdminWorkspaceOverride } from "@/lib/session";
import {
  activityInputFromTemplate,
  documentInputFromTemplate,
  messageTemplateTypes,
  normalizeDueDatePreset,
  taskAssociationFromInput,
  taskDueDateFromInput,
  taskInputFromTemplate,
  taskTemplateActivityNote,
} from "@/lib/templates";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const requiredText = z.string().trim().min(1, "Required");
const feedbackMaxLength = 1200;

const leadSchema = z.object({
  firstName: requiredText,
  lastName: requiredText,
  email: optionalText,
  phone: optionalText,
  source: requiredText,
  referralSource: optionalText,
  address1: requiredText,
  address2: optionalText,
  city: requiredText,
  state: requiredText,
  postalCode: requiredText,
  lossType: requiredText,
  dateOfLoss: optionalText,
  followUpDate: optionalText,
  status: z.enum(["NEW", "CONTACTED", "APPOINTMENT_SET", "CONVERTED", "CLOSED"]).default("NEW"),
  assignedUserId: optionalText,
  notes: optionalText,
});

const claimSchema = z.object({
  firstName: requiredText,
  lastName: requiredText,
  email: optionalText,
  phone: optionalText,
  address1: requiredText,
  address2: optionalText,
  city: requiredText,
  state: requiredText,
  postalCode: requiredText,
  carrierName: optionalText,
  policyNumber: optionalText,
  claimNumber: optionalText,
  lossType: requiredText,
  dateOfLoss: optionalText,
  reportedDate: optionalText,
  inspectionDate: optionalText,
  deadlineDate: optionalText,
  status: z.enum([
    "NEW",
    "IN_REVIEW",
    "WAITING_ON_CLIENT",
    "WAITING_ON_CARRIER",
    "ESTIMATE_SENT",
    "NEGOTIATING",
    "SETTLED",
    "CLOSED",
  ]),
  assignedUserId: optionalText,
  nextStep: optionalText,
  notes: optionalText,
});

const outreachCreateSchema = z.object({
  firmName: z.string().trim().min(2, "Enter a firm name.").max(120, "Firm name is too long."),
  website: z.string().trim().max(255, "Website is too long.").optional().transform((value) => value || undefined),
  state: z.string().trim().max(40, "State is too long.").optional().transform((value) => value || undefined),
  contactName: z.string().trim().max(120, "Contact name is too long.").optional().transform((value) => value || undefined),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.")
    .transform((value) => value?.toLowerCase()),
  source: z.string().trim().max(120, "Source is too long.").optional().transform((value) => value || undefined),
  smallOfficeSignal: z.string().trim().max(240, "Small-office signal is too long.").optional().transform((value) => value || undefined),
  status: z.nativeEnum(OutreachProspectStatus).default(OutreachProspectStatus.NOT_CONTACTED),
  dateContacted: z.string().trim().optional().transform((value) => value || undefined),
  followUpDate: z.string().trim().optional().transform((value) => value || undefined),
  replyObjection: z.string().trim().max(500, "Reply/objection is too long.").optional().transform((value) => value || undefined),
  trialCreated: z.boolean().default(false),
  notes: z.string().trim().max(1200, "Notes are too long.").optional().transform((value) => value || undefined),
});

const outreachUpdateSchema = z.object({
  outreachId: z.string().trim().min(1, "Missing outreach prospect."),
  firmName: z.string().trim().min(2, "Enter a firm name.").max(120, "Firm name is too long.").optional(),
  website: z.string().trim().max(255, "Website is too long.").optional().transform((value) => value || undefined),
  state: z.string().trim().max(40, "State is too long.").optional().transform((value) => value || undefined),
  contactName: z.string().trim().max(120, "Contact name is too long.").optional().transform((value) => value || undefined),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.")
    .transform((value) => value?.toLowerCase()),
  source: z.string().trim().max(120, "Source is too long.").optional().transform((value) => value || undefined),
  smallOfficeSignal: z.string().trim().max(240, "Small-office signal is too long.").optional().transform((value) => value || undefined),
  status: z.nativeEnum(OutreachProspectStatus).optional(),
  dateContacted: z.string().trim().optional().transform((value) => value || undefined),
  followUpDate: z.string().trim().optional().transform((value) => value || undefined),
  replyObjection: z.string().trim().max(500, "Reply/objection is too long.").optional().transform((value) => value || undefined),
  trialCreated: z.boolean().optional(),
  notes: z.string().trim().max(1200, "Notes are too long.").optional().transform((value) => value || undefined),
});

const outreachSendSchema = z.object({
  outreachId: z.string().trim().min(1, "Missing outreach prospect."),
  templateKey: z.string().trim().min(1, "Select an outreach template."),
});

const outreachTaskActionSchema = z.object({
  outreachTaskId: z.string().trim().min(1, "Missing outreach task."),
});

const outreachCallAttemptSchema = z.object({
  outreachId: z.string().trim().min(1, "Missing outreach prospect."),
  note: z.string().trim().max(400, "Call note is too long.").optional().transform((value) => value || undefined),
});

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function checkboxValue(formData: FormData, name: string) {
  const value = formData.get(name)?.toString();
  return value === "on" || value === "true";
}

function textValue(formData: FormData, name: string) {
  return formData.get(name)?.toString().trim() ?? "";
}

function hasFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size > 0;
}

function uploadFileError(formData: FormData, name: string) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size <= 0) return undefined;
  return validateUploadFile(file);
}

function amountValue(formData: FormData, name: string) {
  const value = textValue(formData, name);
  if (!value) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function requiredField(formData: FormData, name: string, message: string, errors: FieldErrors) {
  if (!textValue(formData, name)) errors[name] = message;
}

function positiveAmountField(formData: FormData, name: string, message: string, errors: FieldErrors) {
  const amount = amountValue(formData, name);
  if (amount === undefined || !Number.isFinite(amount) || amount <= 0) errors[name] = message;
}

function nonNegativeAmountField(formData: FormData, name: string, message: string, errors: FieldErrors) {
  const amount = amountValue(formData, name);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) errors[name] = message;
}

function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}

function asDate(value?: string) {
  if (!value) return undefined;
  return new Date(`${value}T12:00:00`);
}

function systemReturnToValue(formData: FormData, fallback: string) {
  const returnTo = textValue(formData, "returnTo");
  if (!returnTo || !returnTo.startsWith("/system/")) {
    return fallback;
  }
  return returnTo;
}

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

function asDateTime(value?: string) {
  if (!value) return undefined;
  return new Date(value);
}

function centsFromInput(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function basisPointsFromPercent(value: FormDataEntryValue | null) {
  const percent = Number(value ?? 0);
  return Number.isFinite(percent) ? Math.round(percent * 100) : 0;
}

function generateTemporaryPassword(length = 18) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^*-_";
  const bytes = randomBytes(length);
  let generated = "";

  for (let i = 0; i < length; i += 1) {
    generated += alphabet[bytes[i] % alphabet.length];
  }

  return generated;
}

async function issueUserInvitation({
  userId,
  userName,
  userEmail,
  workspaceName,
  invitationNote,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  workspaceName: string;
  invitationNote?: string;
}) {
  if (!canSendSystemEmail()) {
    return {
      ok: false as const,
      error: "System email is not configured. Add EMAIL_PROVIDER and RESEND_API_KEY in .env.",
    };
  }

  const token = createPasswordResetTokenValue();
  const tokenHash = hashPasswordResetToken(token);
  const inviteMinutes = resolveUserInvitationTokenMinutes();
  const expiresAt = new Date(Date.now() + inviteMinutes * 60 * 1000);
  const acceptInviteUrl = `${resolveAppBaseUrl()}/accept-invite?token=${encodeURIComponent(token)}`;

  await prisma.userInvitationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const sendResult = await sendUserInvitationEmail({
    toEmail: userEmail,
    userName,
    workspaceName,
    acceptInviteUrl,
    expiresInMinutes: inviteMinutes,
    invitationNote,
  });

  if (!sendResult.ok) {
    await prisma.userInvitationToken.deleteMany({
      where: {
        userId,
        tokenHash,
      },
    });

    return {
      ok: false as const,
      error: sendResult.error ?? "Invitation email could not be sent.",
    };
  }

  await prisma.userInvitationToken.updateMany({
    where: {
      userId,
      acceptedAt: null,
      tokenHash: {
        not: tokenHash,
      },
    },
    data: {
      acceptedAt: new Date(),
    },
  });

  return { ok: true as const };
}

async function requireOwnedClaimId(firmId: string, claimId: string) {
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, firmId },
    select: { id: true },
  });

  if (!claim) {
    throw new Error("Claim not found.");
  }

  return claim.id;
}

async function requireOwnedLeadId(firmId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, firmId },
    select: { id: true },
  });

  if (!lead) {
    throw new Error("Lead not found.");
  }

  return lead.id;
}

async function requireOwnedContactId(firmId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, firmId },
    select: { id: true },
  });

  if (!contact) {
    throw new Error("Contact not found.");
  }

  return contact.id;
}

async function requireOwnedUserId(firmId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, firmId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return user.id;
}

async function getFirmSeatAvailability(firmId: string) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: {
      id: true,
      subscriptionPlan: true,
      includedUserLimit: true,
    },
  });

  if (!firm) {
    throw new Error("Firm not found.");
  }

  const activeUserCount = await prisma.user.count({
    where: {
      firmId,
      active: true,
    },
  });

  const includedUserLimit = resolveIncludedUserLimit(firm);
  const canAdd = canAddActiveUser({ activeUserCount, includedUserLimit });

  return {
    activeUserCount,
    includedUserLimit,
    canAdd,
  };
}

export async function createLead(formData: FormData) {
  const { firm } = await getDemoContext();
  const input = leadSchema.parse(formObject(formData));
  const assignedUserId = input.assignedUserId ? await requireOwnedUserId(firm.id, input.assignedUserId) : undefined;

  const lead = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        firmId: firm.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
      },
    });

    const property = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: input.address1,
        address2: input.address2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      },
    });

    const createdLead = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: contact.id,
        propertyId: property.id,
        assignedUserId,
        source: input.source,
        referralSource: input.referralSource,
        lossType: input.lossType,
        dateOfLoss: asDate(input.dateOfLoss),
        followUpDate: asDate(input.followUpDate),
        status: input.status,
        notes: input.notes,
      },
    });

    if (input.followUpDate) {
      await tx.task.create({
        data: {
          firmId: firm.id,
          leadId: createdLead.id,
          assignedUserId,
          title: `Follow up with ${input.firstName} ${input.lastName}`,
          dueDate: asDate(input.followUpDate),
        },
      });
    }

    return createdLead;
  });

  revalidatePath("/leads");
  redirect(withNotice(`/leads/${lead.id}`, "lead-created"));
}

export async function createLeadWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  requiredField(formData, "firstName", "Add the client's first name.", errors);
  requiredField(formData, "lastName", "Add the client's last name.", errors);
  requiredField(formData, "address1", "Add the damaged property address.", errors);
  requiredField(formData, "city", "Add the property city.", errors);
  requiredField(formData, "state", "Add the property state.", errors);
  requiredField(formData, "postalCode", "Add the property ZIP code.", errors);
  requiredField(formData, "lossType", "Add a short loss type like water damage or roof leak.", errors);
  requiredField(formData, "source", "Add where this lead came from.", errors);

  if (hasErrors(errors)) {
    return formError("Add the client name, property basics, loss type, and lead source before saving this lead.", errors);
  }

  await createLead(formData);
  return {};
}

export async function convertLeadToClaim(leadId: string, formData: FormData) {
  const { firm, user } = await getDemoContext();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, firmId: firm.id }, include: { contact: true, property: true } });
  if (!lead) throw new Error("Lead not found.");
  if (lead.convertedClaimId) redirect(`/claims/${lead.convertedClaimId}`);

  const carrierName = z.string().trim().optional().parse(formData.get("carrierName")?.toString() || undefined);
  const policyNumber = z.string().trim().optional().parse(formData.get("policyNumber")?.toString() || undefined);
  const claimNumber = z.string().trim().optional().parse(formData.get("claimNumber")?.toString() || undefined);
  const nextStep = z.string().trim().optional().parse(formData.get("nextStep")?.toString() || undefined);
  const followUpTaskTitle = z.string().trim().optional().parse(formData.get("followUpTaskTitle")?.toString() || undefined);
  const followUpDueDate = asDate(formData.get("followUpDueDate")?.toString());

  const claim = await prisma.$transaction(async (tx) => {
    const existingCarrier = carrierName ? await tx.carrier.findFirst({ where: { firmId: firm.id, name: carrierName } }) : undefined;
    const carrier = carrierName && !existingCarrier ? await tx.carrier.create({ data: { firmId: firm.id, name: carrierName } }) : existingCarrier;

    const policy = policyNumber
      ? await tx.policy.create({
          data: {
            firmId: firm.id,
            carrierId: carrier?.id,
            policyNumber,
            claimNumber,
          },
        })
      : undefined;

    const createdClaim = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: lead.contactId,
        propertyId: lead.propertyId,
        policyId: policy?.id,
        carrierId: carrier?.id,
        leadId: lead.id,
        assignedUserId: lead.assignedUserId ?? user.id,
        claimNumber,
        lossType: lead.lossType,
        dateOfLoss: lead.dateOfLoss,
        reportedDate: new Date(),
        status: ClaimStatus.NEW,
        nextStep: nextStep || "Review policy and schedule next follow-up.",
        notes: lead.notes,
      },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.CONVERTED, convertedClaimId: createdClaim.id },
    });

    await tx.task.updateMany({
      where: { leadId: lead.id, status: TaskStatus.OPEN },
      data: { status: TaskStatus.DONE, completedAt: new Date() },
    });

    await tx.task.create({
      data: {
        firmId: firm.id,
        claimId: createdClaim.id,
        assignedUserId: lead.assignedUserId ?? user.id,
        title: followUpTaskTitle || `First claim follow-up for ${lead.contact.firstName} ${lead.contact.lastName}`,
        notes: nextStep || "Confirm carrier details, collect the policy, and set the next claim step.",
        priority: TaskPriority.NORMAL,
        dueDate: followUpDueDate ?? new Date(),
      },
    });

    await tx.activity.create({
      data: {
        firmId: firm.id,
        leadId: lead.id,
        claimId: createdClaim.id,
        contactId: lead.contactId,
        userId: user.id,
        type: ActivityType.NOTE,
        subject: "Lead converted to claim",
        body: "Lead intake information was used to open the claim.",
      },
    });

    return createdClaim;
  });

  revalidatePath("/leads");
  revalidatePath("/claims");
  revalidatePath("/today");
  redirect(withNotice(`/claims/${claim.id}`, "lead-converted"));
}

export async function convertLeadToClaimWithState(leadId: string, _state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  await convertLeadToClaim(leadId, formData);
  return {};
}

export async function createClaim(formData: FormData) {
  const { firm } = await getDemoContext();
  const input = claimSchema.parse(formObject(formData));
  const assignedUserId = input.assignedUserId ? await requireOwnedUserId(firm.id, input.assignedUserId) : undefined;
  const existingClaimCount = await prisma.claim.count({ where: { firmId: firm.id } });

  const claim = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        firmId: firm.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
      },
    });

    const property = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: input.address1,
        address2: input.address2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      },
    });

    const existingCarrier = input.carrierName ? await tx.carrier.findFirst({ where: { firmId: firm.id, name: input.carrierName } }) : undefined;
    const carrier = input.carrierName && !existingCarrier ? await tx.carrier.create({ data: { firmId: firm.id, name: input.carrierName } }) : existingCarrier;
    const policy = input.policyNumber
      ? await tx.policy.create({
          data: {
            firmId: firm.id,
            carrierId: carrier?.id,
            policyNumber: input.policyNumber,
            claimNumber: input.claimNumber,
          },
        })
      : undefined;

    return tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: contact.id,
        propertyId: property.id,
        policyId: policy?.id,
        carrierId: carrier?.id,
        assignedUserId,
        claimNumber: input.claimNumber,
        lossType: input.lossType,
        dateOfLoss: asDate(input.dateOfLoss),
        reportedDate: asDate(input.reportedDate),
        inspectionDate: asDate(input.inspectionDate),
        deadlineDate: asDate(input.deadlineDate),
        status: input.status,
        nextStep: input.nextStep,
        notes: input.notes,
      },
    });
  });

  revalidatePath("/claims");
  const claimPath = existingClaimCount === 0 ? `/claims/${claim.id}?firstClaim=1` : `/claims/${claim.id}`;
  redirect(withNotice(claimPath, "claim-created"));
}

export async function createClaimWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  requiredField(formData, "firstName", "Add the client's first name.", errors);
  requiredField(formData, "lastName", "Add the client's last name.", errors);
  requiredField(formData, "address1", "Add the damaged property address.", errors);
  requiredField(formData, "city", "Add the property city.", errors);
  requiredField(formData, "state", "Add the property state.", errors);
  requiredField(formData, "postalCode", "Add the property ZIP code.", errors);
  requiredField(formData, "lossType", "Add a short loss type like water damage or roof leak.", errors);

  if (hasErrors(errors)) {
    return formError("Add the client name, damaged property address, and loss type before saving this claim.", errors);
  }

  await createClaim(formData);
  return {};
}

export async function updateClaimClientStatusWithState(claimId: string, _state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const { firm, user } = await getDemoContext();
  const validation = validateClientStatusUpdateInput({
    publicSummary: textValue(formData, "publicSummary"),
    nextStep: textValue(formData, "nextStep"),
    status: formData.get("status")?.toString(),
  });
  const returnPath = `/claims/${claimId}/client-status`;

  if (hasErrors(validation.errors)) {
    return formError("Shorten the client-facing status update before saving.", validation.errors);
  }

  const claim = await prisma.claim.findFirst({
    where: { id: claimId, firmId: firm.id },
    include: { statusLinks: { select: { token: true } } },
  });
  if (!claim) throw new Error("Claim not found.");

  const nextStatus = validation.data.status || claim.status;
  const changedFields = [
    validation.data.publicSummary !== claim.publicSummary ? "last update" : undefined,
    validation.data.nextStep !== claim.nextStep ? "next step" : undefined,
    nextStatus !== claim.status ? "status" : undefined,
  ].filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.claim.update({
      where: { id: claim.id },
      data: {
        publicSummary: validation.data.publicSummary,
        nextStep: validation.data.nextStep,
        status: nextStatus,
      },
    });

    if (changedFields.length > 0) {
      await tx.activity.create({
        data: {
          firmId: firm.id,
          claimId: claim.id,
          contactId: claim.contactId,
          userId: user.id,
          type: ActivityType.NOTE,
          subject: "Client status updated",
          body: `Updated client-visible ${changedFields.join(", ")}.`,
        },
      });
    }
  });

  revalidatePath(returnPath);
  revalidatePath(`/claims/${claim.id}`);
  revalidatePath("/claims");
  for (const statusLink of claim.statusLinks) {
    revalidatePath(`/status/${statusLink.token}`);
  }

  redirect(withNotice(returnPath, "client-status-updated"));
}

async function generateUniqueClientStatusToken() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const token = generateClientStatusToken();
    const existing = await prisma.clientStatusLink.findUnique({ where: { token }, select: { id: true } });
    if (!existing) return token;
  }

  throw new Error("Could not create a unique client status link. Try again.");
}

export async function createClientStatusLink(claimId: string) {
  const { firm, user } = await getDemoContext();
  const returnPath = `/claims/${claimId}/client-status`;
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, firmId: firm.id },
    select: { id: true, contactId: true },
  });
  if (!claim) throw new Error("Claim not found.");

  const token = await generateUniqueClientStatusToken();
  const statusLink = await prisma.$transaction(async (tx) => {
    await tx.clientStatusLink.updateMany({ where: { firmId: firm.id, claimId: claim.id, isActive: true }, data: { isActive: false } });
    const createdLink = await tx.clientStatusLink.create({
      data: {
        firmId: firm.id,
        claimId: claim.id,
        token,
        isActive: true,
      },
    });

    await tx.activity.create({
      data: {
        firmId: firm.id,
        claimId: claim.id,
        contactId: claim.contactId,
        userId: user.id,
        type: ActivityType.NOTE,
        subject: "Client status link enabled",
        body: "Created a shareable client status link for this claim.",
      },
    });

    return createdLink;
  });

  revalidatePath(returnPath);
  revalidatePath(`/status/${statusLink.token}`);
  redirect(withNotice(returnPath, "client-link-created"));
}

async function updateClientStatusLinkActive(claimId: string, linkId: string, isActive: boolean) {
  const { firm, user } = await getDemoContext();
  const returnPath = `/claims/${claimId}/client-status`;
  const statusLink = await prisma.clientStatusLink.findFirst({
    where: { id: linkId, claimId, firmId: firm.id },
    include: { claim: { select: { contactId: true } } },
  });
  if (!statusLink) throw new Error("Client status link not found.");

  await prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.clientStatusLink.updateMany({ where: { firmId: firm.id, claimId, isActive: true, id: { not: statusLink.id } }, data: { isActive: false } });
    }

    await tx.clientStatusLink.update({ where: { id: statusLink.id }, data: { isActive } });

    await tx.activity.create({
      data: {
        firmId: firm.id,
        claimId,
        contactId: statusLink.claim.contactId,
        userId: user.id,
        type: ActivityType.NOTE,
        subject: isActive ? "Client status link enabled" : "Client status link disabled",
        body: isActive ? "Re-enabled a client status link for this claim." : "Disabled a client status link for this claim.",
      },
    });
  });

  revalidatePath(returnPath);
  revalidatePath(`/claims/${claimId}`);
  revalidatePath(`/status/${statusLink.token}`);
  redirect(withNotice(returnPath, isActive ? "client-link-reactivated" : "client-link-paused"));
}

export async function regenerateClientStatusLink(claimId: string, linkId: string) {
  const { firm, user } = await getDemoContext();
  const returnPath = `/claims/${claimId}/client-status`;
  const statusLink = await prisma.clientStatusLink.findFirst({
    where: { id: linkId, claimId, firmId: firm.id },
    include: { claim: { select: { contactId: true } } },
  });
  if (!statusLink) throw new Error("Client status link not found.");

  const oldToken = statusLink.token;
  const token = await generateUniqueClientStatusToken();
  const regeneratedLink = await prisma.$transaction(async (tx) => {
    await tx.clientStatusLink.updateMany({ where: { firmId: firm.id, claimId, isActive: true, id: { not: statusLink.id } }, data: { isActive: false } });
    const updatedLink = await tx.clientStatusLink.update({ where: { id: statusLink.id }, data: { token, isActive: true } });

    await tx.activity.create({
      data: {
        firmId: firm.id,
        claimId,
        contactId: statusLink.claim.contactId,
        userId: user.id,
        type: ActivityType.NOTE,
        subject: "Client status link regenerated",
        body: "Regenerated the shareable client status link. The previous link no longer opens this claim status page.",
      },
    });

    return updatedLink;
  });

  revalidatePath(returnPath);
  revalidatePath(`/claims/${claimId}`);
  revalidatePath(`/status/${oldToken}`);
  revalidatePath(`/status/${regeneratedLink.token}`);
  redirect(withNotice(returnPath, "client-link-regenerated"));
}

export async function pauseClientStatusLink(claimId: string, linkId: string) {
  await updateClientStatusLinkActive(claimId, linkId, false);
}

export async function reactivateClientStatusLink(claimId: string, linkId: string) {
  await updateClientStatusLinkActive(claimId, linkId, true);
}

export async function setClientStatusLinkActive(claimId: string, linkId: string, isActive: boolean) {
  await updateClientStatusLinkActive(claimId, linkId, isActive);
}

export async function createTask(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const taskAssociation = taskAssociationFromInput({
    claimId: formData.get("claimId")?.toString(),
    leadId: formData.get("leadId")?.toString(),
  });
  if (taskAssociation.error) throw new Error(taskAssociation.error);

  const rawClaimId = taskAssociation.claimId;
  const rawLeadId = taskAssociation.leadId;
  const rawAssignedUserId = formData.get("assignedUserId")?.toString() || undefined;
  const taskTemplateKey = formData.get("taskTemplateKey")?.toString();
  const claimId = rawClaimId ? await requireOwnedClaimId(firm.id, rawClaimId) : undefined;
  const leadId = rawLeadId ? await requireOwnedLeadId(firm.id, rawLeadId) : undefined;
  const assignedUserId = rawAssignedUserId ? await requireOwnedUserId(firm.id, rawAssignedUserId) : undefined;
  const returnPath = formData.get("returnPath")?.toString() || "/today";
  const taskInput = taskInputFromTemplate({
    templateKey: taskTemplateKey,
    title: formData.get("title")?.toString(),
    notes: formData.get("notes")?.toString(),
    priority: formData.get("priority")?.toString(),
  });
  const dueDate = taskDueDateFromInput({
    duePreset: formData.get("duePreset")?.toString(),
    dueDate: formData.get("dueDate")?.toString(),
  });

  const [claimTaskContext, leadTaskContext] = await Promise.all([
    claimId
      ? prisma.claim.findFirst({
          where: { id: claimId, firmId: firm.id },
          select: { assignedUserId: true, contactId: true },
        })
      : Promise.resolve(null),
    leadId
      ? prisma.lead.findFirst({
          where: { id: leadId, firmId: firm.id },
          select: { assignedUserId: true, contactId: true },
        })
      : Promise.resolve(null),
  ]);

  const resolvedAssignedUserId = assignedUserId ?? claimTaskContext?.assignedUserId ?? leadTaskContext?.assignedUserId ?? user.id;
  const activityNote = taskTemplateActivityNote({
    templateKey: taskTemplateKey,
    taskTitle: requiredText.parse(taskInput.title),
    dueDate,
    target: taskAssociation.target,
  });

  await prisma.$transaction(async (tx) => {
    await tx.task.create({
      data: {
        firmId: firm.id,
        claimId,
        leadId,
        assignedUserId: resolvedAssignedUserId,
        title: requiredText.parse(taskInput.title),
        notes: taskInput.notes,
        priority: taskInput.priority,
        dueDate,
      },
    });

    if (claimId || leadId) {
      await tx.activity.create({
        data: {
          firmId: firm.id,
          userId: user.id,
          claimId,
          leadId,
          contactId: claimTaskContext?.contactId ?? leadTaskContext?.contactId,
          type: ActivityType.NOTE,
          subject: activityNote?.subject ?? `Task added: ${requiredText.parse(taskInput.title)}`,
          body: activityNote?.body ?? `Added task \"${requiredText.parse(taskInput.title)}\".${dueDate ? ` Due ${dueDate.toISOString().slice(0, 10)}.` : ""}`,
        },
      });
    }
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "task-created"));
}

export async function createTaskWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  const taskAssociation = taskAssociationFromInput({
    claimId: formData.get("claimId")?.toString(),
    leadId: formData.get("leadId")?.toString(),
  });
  const taskInput = taskInputFromTemplate({
    templateKey: formData.get("taskTemplateKey")?.toString(),
    title: formData.get("title")?.toString(),
    notes: formData.get("notes")?.toString(),
    priority: formData.get("priority")?.toString(),
  });
  const duePreset = normalizeDueDatePreset(formData.get("duePreset")?.toString());

  if (!taskInput.title) errors.title = "Choose a common task or add a short task name.";
  if (duePreset === "CUSTOM" && !textValue(formData, "dueDate")) errors.dueDate = "Choose a custom due date.";
  if (taskAssociation.error) errors.title = "Choose a lead or a claim for this task.";

  if (hasErrors(errors)) {
    return formError("Choose a common task and due date before saving this follow-up.", errors);
  }

  await createTask(formData);
  return {};
}

export async function updateTask(taskId: string, returnPath: string, formData: FormData) {
  const { firm } = await getDemoContext();
  const task = await prisma.task.findFirst({ where: { id: taskId, firmId: firm.id }, select: { id: true } });
  if (!task) {
    throw new Error("Task not found.");
  }

  const rawAssignedUserId = formData.get("assignedUserId")?.toString() || undefined;
  const assignedUserId = rawAssignedUserId ? await requireOwnedUserId(firm.id, rawAssignedUserId) : undefined;

  await prisma.task.updateMany({
    where: { id: task.id, firmId: firm.id },
    data: {
      title: requiredText.parse(formData.get("title")?.toString()),
      notes: formData.get("notes")?.toString() || undefined,
      assignedUserId,
      priority: (formData.get("priority")?.toString() as TaskPriority) || TaskPriority.NORMAL,
      dueDate: asDate(formData.get("dueDate")?.toString()),
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "task-saved"));
}

export async function updateClaimDeadline(claimId: string, returnPath: string, formData: FormData) {
  const { firm } = await getDemoContext();
  await prisma.claim.updateMany({
    where: { id: claimId, firmId: firm.id },
    data: {
      deadlineDate: asDate(formData.get("deadlineDate")?.toString()),
      nextStep: formData.get("nextStep")?.toString() || undefined,
    },
  });

  revalidatePath(returnPath);
  revalidatePath(`/claims/${claimId}`);
  revalidatePath("/claims");
  revalidatePath("/today");
  redirect(withNotice(returnPath, "deadline-saved"));
}

export async function updateClaimDeadlineWithState(claimId: string, _state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  await updateClaimDeadline(claimId, `/claims/${claimId}/tasks`, formData);
  return {};
}

export async function toggleTask(taskId: string, returnPath: string) {
  const { firm, user } = await getDemoContext();
  const task = await prisma.task.findFirst({
    where: { id: taskId, firmId: firm.id },
    select: { id: true, title: true, status: true, claimId: true, leadId: true, claim: { select: { contactId: true } }, lead: { select: { contactId: true } } },
  });
  if (!task) throw new Error("Task not found.");

  const done = task.status === TaskStatus.DONE;
  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: task.id },
      data: {
        status: done ? TaskStatus.OPEN : TaskStatus.DONE,
        completedAt: done ? null : new Date(),
      },
    });

    if (task.claimId || task.leadId) {
      await tx.activity.create({
        data: {
          firmId: firm.id,
          userId: user.id,
          claimId: task.claimId,
          leadId: task.leadId,
          contactId: task.claim?.contactId ?? task.lead?.contactId,
          type: ActivityType.NOTE,
          subject: done ? "Task reopened" : "Task marked complete",
          body: `${done ? "Reopened" : "Completed"} task \"${task.title}\".`,
        },
      });
    }
  });

  revalidatePath(returnPath);
}

export async function createDocument(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const rawClaimId = formData.get("claimId")?.toString() || undefined;
  const rawLeadId = formData.get("leadId")?.toString() || undefined;
  const rawRequestedDocumentId = formData.get("requestedDocumentId")?.toString() || undefined;
  const claimId = rawClaimId ? await requireOwnedClaimId(firm.id, rawClaimId) : undefined;
  const leadId = rawLeadId ? await requireOwnedLeadId(firm.id, rawLeadId) : undefined;
  const returnPath = formData.get("returnPath")?.toString() || "/claims";
  const file = formData.get("file");
  const hasUpload = file instanceof File && file.size > 0;
  const fileError = uploadFileError(formData, "file");
  if (fileError) throw new Error(fileError);
  const upload = hasUpload ? await saveUploadedFile(file) : {};
  const fallbackTitle = file instanceof File && file.name ? file.name : "Document";
  const documentInput = documentInputFromTemplate({
    templateKey: formData.get("documentTemplateKey")?.toString(),
    title: formData.get("title")?.toString(),
    category: formData.get("category")?.toString(),
    notes: formData.get("notes")?.toString(),
    requestedFromClient: formData.get("requestedFromClient") === "on",
    hasFile: hasUpload,
  });
  const clientVisibleNote = formData.get("clientVisibleNote")?.toString().trim() || undefined;

  if (rawRequestedDocumentId) {
    const requestedDocument = await prisma.document.findFirst({
      where: {
        id: rawRequestedDocumentId,
        firmId: firm.id,
        claimId,
        OR: [
          { requestedFromClient: true },
          { requestStatus: DocumentRequestStatus.REQUESTED },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
    });

    if (!requestedDocument) {
      throw new Error("Document request not found.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: requestedDocument.id },
        data: {
          uploadedByUserId: user.id,
          title: documentInput.title || requestedDocument.title,
          category: documentInput.category || requestedDocument.category,
          notes: documentInput.notes,
          clientVisibleNote,
          ...documentRequestResolution(DocumentRequestStatus.RECEIVED),
          clientProvided: false,
          ...upload,
        },
      });

      await tx.activity.create({
        data: {
          firmId: firm.id,
          userId: user.id,
          claimId,
          type: ActivityType.NOTE,
          subject: "Document request marked received",
          body: hasUpload
            ? `Marked \"${documentInput.title || requestedDocument.title}\" received and attached an uploaded file.`
            : `Marked \"${documentInput.title || requestedDocument.title}\" received.`,
        },
      });
    });

    revalidatePath(returnPath);
    redirect(withNotice(returnPath, "document-request-received"));
  }

  await prisma.document.create({
    data: {
      firmId: firm.id,
      claimId,
      leadId,
      uploadedByUserId: user.id,
      category: documentInput.category,
      title: documentInput.title || fallbackTitle,
      notes: documentInput.notes,
      clientVisibleNote,
      requestStatus: documentInput.requestedFromClient ? DocumentRequestStatus.REQUESTED : null,
      clientProvided: false,
      requestedFromClient: documentInput.requestedFromClient,
      receivedAt: documentInput.requestedFromClient ? null : new Date(),
      ...upload,
    },
  });

  if (documentInput.requestedFromClient && claimId) {
    await prisma.activity.create({
      data: {
        firmId: firm.id,
        userId: user.id,
        claimId,
        type: ActivityType.NOTE,
        subject: "Document request created",
        body: `Requested \"${documentInput.title || fallbackTitle}\" from the client.`,
      },
    });
  }

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, documentInput.requestedFromClient ? "document-requested" : "document-added"));
}

export async function createDocumentWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  const hasUploadedFile = hasFile(formData, "file");
  const requestedDocumentId = formData.get("requestedDocumentId")?.toString() || "";
  const fileError = uploadFileError(formData, "file");
  const documentInput = documentInputFromTemplate({
    templateKey: formData.get("documentTemplateKey")?.toString(),
    title: formData.get("title")?.toString(),
    category: formData.get("category")?.toString(),
    notes: formData.get("notes")?.toString(),
    requestedFromClient: formData.get("requestedFromClient") === "on",
    hasFile: hasUploadedFile,
  });
  const requestedFromClient = documentInput.requestedFromClient;

  const documentValidationError = validateDocumentCreateInput({
    requestedFromClient,
    requestedDocumentId,
    title: documentInput.title,
    hasUploadedFile,
  });

  if (documentValidationError) {
    errors.title = documentValidationError;
  }

  if (fileError) {
    errors.file = fileError;
  }

  if (hasErrors(errors)) {
    return formError("Add enough detail so the office knows what document this is.", errors);
  }

  await createDocument(formData);
  return {};
}

export async function markDocumentRequestStatus(claimId: string, documentId: string, status: DocumentRequestStatus, returnPath: string) {
  const { firm, user } = await getDemoContext();
  const ownedClaimId = await requireOwnedClaimId(firm.id, claimId);
  const requestedDocument = await prisma.document.findFirst({
    where: {
      id: documentId,
      firmId: firm.id,
      claimId: ownedClaimId,
      OR: [
        { requestedFromClient: true },
        { requestStatus: DocumentRequestStatus.REQUESTED },
      ],
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!requestedDocument) {
    throw new Error("Document request not found.");
  }

  const isReceived = status === DocumentRequestStatus.RECEIVED;
  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: requestedDocument.id },
      data: {
        ...documentRequestResolution(status),
        clientProvided: false,
      },
    });

    await tx.activity.create({
      data: {
        firmId: firm.id,
        userId: user.id,
        claimId: ownedClaimId,
        type: ActivityType.NOTE,
        subject: isReceived ? "Document request marked received" : "Document request marked not needed",
        body: isReceived
          ? `Marked \"${requestedDocument.title}\" received.`
          : `Marked \"${requestedDocument.title}\" not needed.`,
      },
    });
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, isReceived ? "document-request-received" : "document-request-not-needed"));
}

export async function createActivity(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const rawClaimId = formData.get("claimId")?.toString() || undefined;
  const rawLeadId = formData.get("leadId")?.toString() || undefined;
  const rawContactId = formData.get("contactId")?.toString() || undefined;
  const rawTemplateKey = formData.get("activityTemplateKey")?.toString() || undefined;
  const claimId = rawClaimId ? await requireOwnedClaimId(firm.id, rawClaimId) : undefined;
  const leadId = rawLeadId ? await requireOwnedLeadId(firm.id, rawLeadId) : undefined;
  const contactId = rawContactId ? await requireOwnedContactId(firm.id, rawContactId) : undefined;
  const returnPath = formData.get("returnPath")?.toString() || "/claims";
  const template = rawTemplateKey
    ? await prisma.template.findFirst({
        where: {
          id: rawTemplateKey,
          firmId: firm.id,
          type: { in: messageTemplateTypes },
        },
        select: {
          name: true,
          subject: true,
          body: true,
          type: true,
        },
      })
    : undefined;
  const activityInput = activityInputFromTemplate({
    template: template ?? undefined,
    subject: formData.get("subject")?.toString(),
    body: formData.get("body")?.toString(),
  });
  const allowBodyOnly = formData.get("allowBodyOnly") === "on";
  const generatedSubject = allowBodyOnly ? validateManualActivityInput({ subject: activityInput.subject, body: activityInput.body }) : undefined;

  await prisma.activity.create({
    data: {
      firmId: firm.id,
      claimId,
      leadId,
      contactId,
      userId: user.id,
      type: (formData.get("type")?.toString() as ActivityType) || ActivityType.NOTE,
      subject: requiredText.parse(activityInput.subject || generatedSubject),
      body: activityInput.body,
      occurredAt: asDateTime(formData.get("occurredAt")?.toString()) ?? new Date(),
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "note-added"));
}

export async function createActivityWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  const { firm } = await getDemoContext();
  const rawTemplateKey = formData.get("activityTemplateKey")?.toString() || undefined;
  const template = rawTemplateKey
    ? await prisma.template.findFirst({
        where: {
          id: rawTemplateKey,
          firmId: firm.id,
          type: { in: messageTemplateTypes },
        },
        select: {
          name: true,
          subject: true,
          body: true,
          type: true,
        },
      })
    : undefined;
  const activityInput = activityInputFromTemplate({
    template: template ?? undefined,
    subject: formData.get("subject")?.toString(),
    body: formData.get("body")?.toString(),
  });
  const allowBodyOnly = formData.get("allowBodyOnly") === "on";
  const generatedSubject = allowBodyOnly ? validateManualActivityInput({ subject: activityInput.subject, body: activityInput.body }) : undefined;

  if (!activityInput.subject && !generatedSubject) errors.subject = "Add a short subject or note text before saving.";

  if (hasErrors(errors)) {
    return formError("Add a subject or note details before saving this timeline entry.", errors);
  }

  await createActivity(formData);
  return {};
}

export async function createSettlementRound(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const claimId = requiredText.parse(formData.get("claimId")?.toString());
  const ownedClaimId = await requireOwnedClaimId(firm.id, claimId);
  const returnPath = formData.get("returnPath")?.toString() || `/claims/${claimId}/money`;
  const existingCount = await prisma.settlementRound.count({ where: { firmId: firm.id, claimId: ownedClaimId } });
  const status = (formData.get("status")?.toString() as SettlementStatus) || SettlementStatus.OFFER_RECEIVED;
  const acceptedAmountCents = centsFromInput(formData.get("acceptedAmount"));

  await prisma.$transaction(async (tx) => {
    await tx.settlementRound.create({
      data: {
        firmId: firm.id,
        claimId: ownedClaimId,
        roundNumber: existingCount + 1,
        demandAmountCents: centsFromInput(formData.get("demandAmount")) || undefined,
        offerAmountCents: centsFromInput(formData.get("offerAmount")) || undefined,
        acceptedAmountCents: acceptedAmountCents || undefined,
        status,
        offeredAt: asDate(formData.get("offeredAt")?.toString()) ?? new Date(),
        notes: formData.get("notes")?.toString() || undefined,
      },
    });

    if (status === SettlementStatus.ACCEPTED) {
      await tx.claim.update({ where: { id: ownedClaimId }, data: { status: ClaimStatus.SETTLED } });
    }

    const claim = await tx.claim.findFirst({ where: { id: ownedClaimId, firmId: firm.id }, select: { contactId: true } });
    await tx.activity.create({
      data: {
        firmId: firm.id,
        userId: user.id,
        claimId: ownedClaimId,
        contactId: claim?.contactId,
        type: ActivityType.NOTE,
        subject: "Settlement round saved",
        body: `Saved settlement round ${existingCount + 1}${acceptedAmountCents ? ` with accepted amount ${acceptedAmountCents / 100}.` : "."}`,
      },
    });
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "settlement-added"));
}

export async function createSettlementRoundWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  nonNegativeAmountField(formData, "demandAmount", "Demand amount cannot be negative.", errors);
  nonNegativeAmountField(formData, "offerAmount", "Offer amount cannot be negative.", errors);
  nonNegativeAmountField(formData, "acceptedAmount", "Accepted amount cannot be negative.", errors);

  const demandAmount = amountValue(formData, "demandAmount") ?? 0;
  const offerAmount = amountValue(formData, "offerAmount") ?? 0;
  const acceptedAmount = amountValue(formData, "acceptedAmount") ?? 0;
  const status = formData.get("status")?.toString();

  if (!hasErrors(errors) && demandAmount <= 0 && offerAmount <= 0 && acceptedAmount <= 0) {
    errors.demandAmount = "Add at least one settlement amount.";
  }

  if (status === "ACCEPTED" && acceptedAmount <= 0) {
    errors.acceptedAmount = "Add the accepted amount before marking this accepted.";
  }

  if (hasErrors(errors)) {
    return formError("Add a valid demand, offer, or accepted amount before saving this settlement round.", errors);
  }

  await createSettlementRound(formData);
  return {};
}

export async function recordPayment(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const claimId = requiredText.parse(formData.get("claimId")?.toString());
  const ownedClaimId = await requireOwnedClaimId(firm.id, claimId);
  const invoiceId = formData.get("invoiceId")?.toString() || undefined;
  const returnPath = formData.get("returnPath")?.toString() || `/claims/${claimId}/money`;
  const amountCents = centsFromInput(formData.get("amount"));

  let scopedInvoiceId: string | undefined;
  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, firmId: firm.id, claimId: ownedClaimId },
      select: { id: true },
    });

    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    scopedInvoiceId = invoice.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        firmId: firm.id,
        claimId: ownedClaimId,
        invoiceId: scopedInvoiceId,
        source: "MANUAL",
        amountCents,
        paidAt: asDate(formData.get("paidAt")?.toString()) ?? new Date(),
        checkNumber: formData.get("checkNumber")?.toString() || undefined,
        payee: requiredText.parse(formData.get("payee")?.toString()),
        notes: formData.get("notes")?.toString() || undefined,
      },
    });

    if (scopedInvoiceId) {
      const invoice = await tx.invoice.findFirst({ where: { id: scopedInvoiceId, firmId: firm.id, claimId: ownedClaimId } });
      if (invoice) {
        const amountPaidCents = invoice.amountPaidCents + amountCents;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaidCents,
            status: amountPaidCents >= invoice.feeAmountCents ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
            paidAt: amountPaidCents >= invoice.feeAmountCents ? new Date() : invoice.paidAt,
          },
        });
      }
    }

    const claim = await tx.claim.findFirst({ where: { id: ownedClaimId, firmId: firm.id }, select: { contactId: true } });
    await tx.activity.create({
      data: {
        firmId: firm.id,
        userId: user.id,
        claimId: ownedClaimId,
        contactId: claim?.contactId,
        type: ActivityType.NOTE,
        subject: "Payment recorded",
        body: `Recorded payment ${(amountCents / 100).toFixed(2)}${scopedInvoiceId ? " against an invoice" : ""}.`,
      },
    });
  });

  revalidatePath(returnPath);
  revalidatePath("/money");
  redirect(withNotice(returnPath, "payment-recorded"));
}

export async function recordPaymentWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  positiveAmountField(formData, "amount", "Add a payment amount greater than $0.", errors);
  requiredField(formData, "payee", "Add who the check or payment was made out to.", errors);

  if (hasErrors(errors)) {
    return formError("Add the payment amount and payee before recording this check or payment.", errors);
  }

  await recordPayment(formData);
  return {};
}

export async function createInvoice(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const claimId = requiredText.parse(formData.get("claimId")?.toString());
  const ownedClaimId = await requireOwnedClaimId(firm.id, claimId);
  const returnPath = formData.get("returnPath")?.toString() || `/claims/${claimId}/money`;
  const settlementAmountCents = centsFromInput(formData.get("settlementAmount"));
  const feePercentageBasisPoints = basisPointsFromPercent(formData.get("feePercent"));
  const feeAmountCents = Math.round((settlementAmountCents * feePercentageBasisPoints) / 10000);
  const feeRule = await prisma.feeRule.findFirst({ where: { firmId: firm.id, active: true } });

  const invoiceNumber = requiredText.parse(formData.get("invoiceNumber")?.toString());
  await prisma.$transaction(async (tx) => {
    await tx.invoice.create({
      data: {
        firmId: firm.id,
        claimId: ownedClaimId,
        feeRuleId: feeRule?.id,
        clientBillingProvider: firm.clientBillingProvider,
        invoiceNumber,
        status: (formData.get("status")?.toString() as InvoiceStatus) || InvoiceStatus.DRAFT,
        settlementAmountCents,
        feePercentageBasisPoints,
        feeAmountCents,
        issuedAt: asDate(formData.get("issuedAt")?.toString()) ?? new Date(),
        dueAt: asDate(formData.get("dueAt")?.toString()),
        notes: formData.get("notes")?.toString() || undefined,
        externalInvoiceId: undefined,
        externalInvoiceStatus: undefined,
        externalHostedInvoiceUrl: undefined,
        externalInvoicePdfUrl: undefined,
        externalPaymentIntentId: undefined,
        externalAmountDueCents: undefined,
        externalAmountPaidCents: undefined,
        externalSyncedAt: undefined,
        sentToClientAt: undefined,
      },
    });

    const claim = await tx.claim.findFirst({ where: { id: ownedClaimId, firmId: firm.id }, select: { contactId: true } });
    await tx.activity.create({
      data: {
        firmId: firm.id,
        userId: user.id,
        claimId: ownedClaimId,
        contactId: claim?.contactId,
        type: ActivityType.NOTE,
        subject: "Invoice saved",
        body: `Saved invoice ${invoiceNumber} for ${(feeAmountCents / 100).toFixed(2)}.`,
      },
    });
  });

  revalidatePath(returnPath);
  revalidatePath("/money");
  redirect(withNotice(returnPath, "invoice-created"));
}

export async function createInvoiceWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  requiredField(formData, "invoiceNumber", "Add the office invoice number.", errors);
  positiveAmountField(formData, "settlementAmount", "Add a settlement amount greater than $0.", errors);
  positiveAmountField(formData, "feePercent", "Add a fee percent greater than 0.", errors);

  if (hasErrors(errors)) {
    return formError("Add an invoice number, settlement amount, and fee percent before creating this invoice.", errors);
  }

  await createInvoice(formData);
  return {};
}

export async function createTemplate(formData: FormData) {
  const { firm } = await getDemoContext();
  await prisma.template.create({
    data: {
      firmId: firm.id,
      name: requiredText.parse(formData.get("name")?.toString()),
      type: (formData.get("type")?.toString() as TemplateType) || TemplateType.EMAIL,
      subject: formData.get("subject")?.toString() || undefined,
      body: requiredText.parse(formData.get("body")?.toString()),
    },
  });

  revalidatePath("/settings/templates");
  redirect("/settings/templates");
}

export async function deleteTemplate(templateId: string) {
  const { firm } = await getDemoContext();
  await prisma.template.deleteMany({ where: { id: templateId, firmId: firm.id } });

  revalidatePath("/settings/templates");
}

export async function createFeedbackWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const { firm, user } = await getDemoContext();
  const errors: FieldErrors = {};
  const page = textValue(formData, "page");
  const message = textValue(formData, "message");
  const rawRating = textValue(formData, "rating");
  const rating = rawRating ? Number(rawRating) : undefined;

  if (message.length < 10) {
    errors.message = "Add a little detail about what felt confusing, missing, or useful.";
  }

  if (message.length > feedbackMaxLength) {
    errors.message = `Keep feedback under ${feedbackMaxLength} characters.`;
  }

  if (page.length > 140) {
    errors.page = "Keep the page or workflow name short.";
  }

  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    errors.rating = "Choose a rating from 1 to 5, or leave it blank.";
  }

  if (hasErrors(errors)) {
    return formError("Add a short note before sending feedback.", errors);
  }

  await prisma.feedbackEntry.create({
    data: {
      firmId: firm.id,
      userId: user.id,
      page: page || undefined,
      rating,
      message,
    },
  });

  revalidatePath("/feedback");
  redirect(withNotice("/feedback", "feedback-sent"));
}

export async function createUser(formData: FormData) {
  const { firm } = await getDemoContext();
  const name = requiredText.parse(formData.get("name")?.toString());
  const email = requiredText.parse(formData.get("email")?.toString()).toLowerCase();
  const role = (formData.get("role")?.toString() as UserRole) || UserRole.ADJUSTER;
  const active = formData.get("active") === "on";

  if (active) {
    const availability = await getFirmSeatAvailability(firm.id);
    if (!availability.canAdd) {
      redirect("/settings/users?error=user-limit");
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    redirect("/settings/users?error=email-duplicate");
  }

  const createdUser = await prisma.user.create({
    data: {
      firmId: firm.id,
      name,
      email,
      passwordHash: "",
      role,
      active,
    },
  });

  const inviteResult = await issueUserInvitation({
    userId: createdUser.id,
    userName: createdUser.name,
    userEmail: createdUser.email,
    workspaceName: firm.name,
  });

  if (!inviteResult.ok) {
    await prisma.user.delete({ where: { id: createdUser.id } });
    redirect("/settings/users?error=invite-send");
  }

  revalidatePath("/settings/users");
  revalidatePath("/settings");
  redirect(withNotice("/settings/users", "user-invite-sent"));
}

export async function resendUserInvite(userId: string) {
  const { firm } = await getDemoContext();
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, firmId: firm.id },
    select: { id: true, name: true, email: true, active: true },
  });

  if (!targetUser || !targetUser.active) {
    redirect("/settings/users?error=missing");
  }

  const inviteResult = await issueUserInvitation({
    userId: targetUser.id,
    userName: targetUser.name,
    userEmail: targetUser.email,
    workspaceName: firm.name,
  });

  if (!inviteResult.ok) {
    redirect("/settings/users?error=invite-send");
  }

  revalidatePath("/settings/users");
  redirect(withNotice("/settings/users", "user-invite-resent"));
}

export async function setUserActive(userId: string, nextActive: boolean) {
  const { firm, user: currentUser } = await getDemoContext();
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, firmId: firm.id },
    select: { id: true, role: true, active: true },
  });

  if (!targetUser) {
    redirect("/settings/users?error=missing");
  }

  if (!nextActive && targetUser.id === currentUser.id) {
    redirect("/settings/users?error=current-user");
  }

  if (!nextActive && targetUser.role === UserRole.OWNER) {
    const activeOwnerCount = await prisma.user.count({
      where: { firmId: firm.id, role: UserRole.OWNER, active: true },
    });
    if (activeOwnerCount <= 1) {
      redirect("/settings/users?error=last-owner");
    }
  }

  if (nextActive && !targetUser.active) {
    const availability = await getFirmSeatAvailability(firm.id);
    if (!availability.canAdd) {
      redirect("/settings/users?error=user-limit");
    }
  }

  if (targetUser.active !== nextActive) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { active: nextActive },
    });
  }

  revalidatePath("/settings/users");
  revalidatePath("/settings");
  redirect(withNotice("/settings/users", nextActive ? "user-activated" : "user-deactivated"));
}

export async function uploadStatusDocument(token: string, formData: FormData) {
  const now = new Date();
  const statusLink = await prisma.clientStatusLink.findUnique({
    where: { token },
    include: {
      claim: {
        include: {
          documents: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!statusLink || !statusLink.isActive) throw new Error("Status page is not available.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  const fileError = validateClientStatusUploadInput({ size: file.size, mimeType: file.type, fileName: file.name });
  if (fileError) throw new Error(fileError);

  const requestedDocumentId = formData.get("requestedDocumentId")?.toString() || undefined;
  const replacementTitle = formData.get("title")?.toString().trim() || undefined;
  const uploadedNote = clientStatusUploadMarker;
  const claimLabel = statusLink.claim.claimNumber ? `Claim #${statusLink.claim.claimNumber}` : "this claim";

  if (requestedDocumentId) {
    const requestedDocument = statusLink.claim.documents.find(
      (document) =>
        document.id === requestedDocumentId &&
        (document.requestedFromClient || document.requestStatus === DocumentRequestStatus.REQUESTED) &&
        document.firmId === statusLink.firmId,
    );

    if (!requestedDocument) throw new Error("Choose a requested document from this claim.");

    const upload = await saveUploadedFile(file);
    const mergedNotes = requestedDocument.notes?.includes(uploadedNote) ? requestedDocument.notes : [requestedDocument.notes, uploadedNote].filter(Boolean).join("\n");

    await prisma.document.update({
      where: { id: requestedDocument.id },
      data: {
        title: replacementTitle || requestedDocument.title,
        fileName: file.name,
        filePath: upload.filePath,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes,
        notes: mergedNotes,
        ...documentRequestResolution(DocumentRequestStatus.RECEIVED, now),
        clientProvided: true,
      },
    });

    await prisma.activity.create({
      data: {
        firmId: statusLink.firmId,
        claimId: statusLink.claimId,
        contactId: statusLink.claim.contactId,
        type: ActivityType.NOTE,
        subject: "Client uploaded requested document",
        body: `Client uploaded \"${replacementTitle || requestedDocument.title}\" from the status link for ${claimLabel}.`,
      },
    });
  } else {
    const upload = await saveUploadedFile(file);

    await prisma.document.create({
      data: {
        firmId: statusLink.firmId,
        claimId: statusLink.claimId,
        category: DocumentCategory.OTHER,
        title: replacementTitle || file.name,
        notes: uploadedNote,
        ...documentRequestResolution(DocumentRequestStatus.RECEIVED, now),
        clientProvided: true,
        ...upload,
      },
    });

    await prisma.activity.create({
      data: {
        firmId: statusLink.firmId,
        claimId: statusLink.claimId,
        contactId: statusLink.claim.contactId,
        type: ActivityType.NOTE,
        subject: "Client uploaded document",
        body: `Client uploaded \"${replacementTitle || file.name}\" from the status link for ${claimLabel}.`,
      },
    });
  }
  revalidatePath(`/status/${token}`);
  revalidatePath(`/claims/${statusLink.claimId}`);
  revalidatePath(`/claims/${statusLink.claimId}/client-status`);
  revalidatePath(`/claims/${statusLink.claimId}/documents`);
  redirect(`/status/${token}?uploaded=1`);
}

export async function uploadStatusDocumentWithState(token: string, _state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return formError("Choose a file to upload before sending it to the office.", { file: "Choose a file to upload." });
  }

  const fileError = validateClientStatusUploadInput({ size: file.size, mimeType: file.type, fileName: file.name });
  if (fileError) {
    return formError(fileError, { file: fileError });
  }

  await uploadStatusDocument(token, formData);
  return {};
}

export async function enterSystemWorkspaceView(workspaceId: string) {
  await requireSystemAdminContext();

  const workspace = await prisma.firm.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    redirect("/system/workspaces");
  }

  await setAdminWorkspaceOverride(workspace.id);
  redirect("/today");
}

export async function exitSystemWorkspaceView() {
  await requireSystemAdminContext();
  await clearAdminWorkspaceOverride();
  redirect("/system/workspaces");
}

export async function createSystemWorkspaceWithOwner(formData: FormData) {
  await requireSystemAdminContext();

  const workspaceName = requiredText.parse(formData.get("workspaceName")?.toString());
  const ownerName = requiredText.parse(formData.get("ownerName")?.toString());
  const ownerEmail = z.email().parse(formData.get("ownerEmail")?.toString()).toLowerCase();
  const bootstrapMode = formData.get("bootstrapMode") === "temporary";
  const ownerPasswordInput = formData.get("ownerPassword")?.toString().trim() ?? "";
  const ownerPassword = bootstrapMode
    ? (ownerPasswordInput.length >= 8 ? ownerPasswordInput : generateTemporaryPassword())
    : "";

  const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
  if (existingUser) {
    redirect("/system/workspaces?error=workspace-owner-email");
  }

  const existingWorkspace = await prisma.firm.findFirst({ where: { name: workspaceName }, select: { id: true } });
  if (existingWorkspace) {
    redirect("/system/workspaces?error=workspace-name");
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.firm.create({
      data: {
        name: workspaceName,
      },
    });

    const createdOwner = await tx.user.create({
      data: {
        firmId: createdWorkspace.id,
        name: ownerName,
        email: ownerEmail,
        passwordHash: ownerPassword ? hashPassword(ownerPassword) : "",
        role: UserRole.OWNER,
        active: true,
      },
    });

    return {
      workspace: createdWorkspace,
      owner: createdOwner,
    };
  });

  if (!bootstrapMode) {
    const inviteResult = await issueUserInvitation({
      userId: workspace.owner.id,
      userName: workspace.owner.name,
      userEmail: workspace.owner.email,
      workspaceName: workspace.workspace.name,
    });

    if (!inviteResult.ok) {
      await prisma.user.delete({ where: { id: workspace.owner.id } });
      await prisma.firm.delete({ where: { id: workspace.workspace.id } });
      redirect("/system/workspaces?error=invite-send");
    }
  }

  revalidatePath("/system");
  revalidatePath("/system/workspaces");
  revalidatePath(`/system/workspaces/${workspace.workspace.id}`);

  if (bootstrapMode) {
    redirect(`/system/workspaces/${workspace.workspace.id}?tempPassword=${encodeURIComponent(ownerPassword)}`);
  }

  redirect(withNotice(`/system/workspaces/${workspace.workspace.id}`, "system-workspace-created"));
}

export async function resendSystemUserInvite(userId: string, workspaceId: string) {
  await requireSystemAdminContext();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firmId: true, name: true, email: true, active: true, firm: { select: { name: true } } },
  });

  if (!user || user.firmId !== workspaceId || !user.active) {
    redirect(`/system/workspaces/${workspaceId}?error=user-missing`);
  }

  const inviteResult = await issueUserInvitation({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    workspaceName: user.firm.name,
  });

  if (!inviteResult.ok) {
    redirect(`/system/workspaces/${workspaceId}?error=invite-send`);
  }

  revalidatePath(`/system/workspaces/${workspaceId}`);
  redirect(withNotice(`/system/workspaces/${workspaceId}`, "user-invite-resent"));
}

export async function updateSystemUserEmail(formData: FormData) {
  await requireSystemAdminContext();

  const userId = requiredText.parse(formData.get("userId")?.toString());
  const nextEmail = z.email().parse(formData.get("email")?.toString()).toLowerCase();
  const workspaceId = requiredText.parse(formData.get("workspaceId")?.toString());

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firmId: true },
  });

  if (!user || user.firmId !== workspaceId) {
    redirect(`/system/workspaces/${workspaceId}?error=user-missing`);
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: nextEmail },
    });
  } catch {
    redirect(`/system/workspaces/${workspaceId}?error=user-email-duplicate`);
  }

  revalidatePath("/system/workspaces");
  revalidatePath(`/system/workspaces/${workspaceId}`);
  redirect(withNotice(`/system/workspaces/${workspaceId}`, "system-user-email-updated"));
}

export async function setSystemUserActive(userId: string, workspaceId: string, nextActive: boolean) {
  await requireSystemAdminContext();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, firmId: true },
  });

  if (!targetUser || targetUser.firmId !== workspaceId) {
    redirect(`/system/workspaces/${workspaceId}?error=user-missing`);
  }

  if (!nextActive && targetUser.role === UserRole.OWNER) {
    const activeOwnerCount = await prisma.user.count({
      where: { firmId: workspaceId, role: UserRole.OWNER, active: true },
    });

    if (activeOwnerCount <= 1) {
      redirect(`/system/workspaces/${workspaceId}?error=last-owner`);
    }
  }

  if (nextActive && !targetUser.active) {
    const availability = await getFirmSeatAvailability(workspaceId);
    if (!availability.canAdd) {
      redirect(`/system/workspaces/${workspaceId}?error=user-limit`);
    }
  }

  if (targetUser.active !== nextActive) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { active: nextActive },
    });
  }

  revalidatePath("/system/workspaces");
  revalidatePath(`/system/workspaces/${workspaceId}`);
  redirect(withNotice(`/system/workspaces/${workspaceId}`, nextActive ? "system-user-activated" : "system-user-deactivated"));
}

export async function updateSystemWorkspaceSubscription(formData: FormData) {
  await requireSystemAdminContext();

  const workspaceId = requiredText.parse(formData.get("workspaceId")?.toString());
  const subscriptionPlan = z.nativeEnum(SubscriptionPlan).parse(formData.get("subscriptionPlan")?.toString());
  const subscriptionStatus = z.nativeEnum(SubscriptionStatus).parse(formData.get("subscriptionStatus")?.toString());
  const rawIncludedUserLimit = textValue(formData, "includedUserLimit");

  const workspace = await prisma.firm.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      includedUserLimit: true,
    },
  });

  if (!workspace) {
    redirect("/system/workspaces");
  }

  let explicitIncludedUserLimit: number | undefined;
  if (rawIncludedUserLimit) {
    const parsed = Number(rawIncludedUserLimit);
    if (!Number.isInteger(parsed) || parsed < 1) {
      redirect(`/system/workspaces/${workspaceId}?error=invalid-limit`);
    }
    explicitIncludedUserLimit = parsed;
  }

  const planDefaultLimit = defaultIncludedUserLimit(subscriptionPlan);
  const includedUserLimit = explicitIncludedUserLimit ?? planDefaultLimit ?? workspace.includedUserLimit;

  if (!Number.isInteger(includedUserLimit) || includedUserLimit < 1) {
    redirect(`/system/workspaces/${workspaceId}?error=invalid-limit`);
  }

  await prisma.firm.update({
    where: { id: workspaceId },
    data: {
      subscriptionPlan,
      subscriptionStatus,
      includedUserLimit,
    },
  });

  revalidatePath("/system/workspaces");
  revalidatePath(`/system/workspaces/${workspaceId}`);
  redirect(withNotice(`/system/workspaces/${workspaceId}`, "system-workspace-subscription-updated"));
}

export async function createSystemOutreachProspect(formData: FormData) {
  const sessionUser = await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachCreateSchema.safeParse({
    firmName: textValue(formData, "firmName"),
    website: textValue(formData, "website"),
    state: textValue(formData, "state"),
    contactName: textValue(formData, "contactName"),
    email: textValue(formData, "email"),
    source: textValue(formData, "source"),
    smallOfficeSignal: textValue(formData, "smallOfficeSignal"),
    status: textValue(formData, "status") || OutreachProspectStatus.NOT_CONTACTED,
    dateContacted: textValue(formData, "dateContacted"),
    followUpDate: textValue(formData, "followUpDate"),
    replyObjection: textValue(formData, "replyObjection"),
    trialCreated: checkboxValue(formData, "trialCreated"),
    notes: textValue(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "create-validation"));
  }

  const values = parsed.data;

  const created = await prisma.outreachProspect.create({
    data: {
      firmName: values.firmName,
      website: values.website,
      state: values.state,
      contactName: values.contactName,
      email: values.email,
      source: values.source,
      smallOfficeSignal: values.smallOfficeSignal,
      status: values.status,
      dateContacted: asDate(values.dateContacted),
      followUpDate: asDate(values.followUpDate),
      replyObjection: values.replyObjection,
      trialCreated: values.trialCreated,
      notes: values.notes,
    },
  });

  await applyOutreachStatusTaskRules({
    outreachProspectId: created.id,
    nextStatus: values.status,
    assignedToUserId: sessionUser.id,
  });

  revalidatePath("/system/outreach");
  revalidatePath("/system/outreach/new");
  redirect(withNotice(returnTo, "system-outreach-created"));
}

export async function updateSystemOutreachProspect(formData: FormData) {
  const sessionUser = await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachUpdateSchema.safeParse({
    outreachId: textValue(formData, "outreachId"),
    firmName: textValue(formData, "firmName") || undefined,
    website: textValue(formData, "website") || undefined,
    state: textValue(formData, "state") || undefined,
    contactName: textValue(formData, "contactName") || undefined,
    email: textValue(formData, "email") || undefined,
    source: textValue(formData, "source") || undefined,
    smallOfficeSignal: textValue(formData, "smallOfficeSignal") || undefined,
    status: textValue(formData, "status"),
    dateContacted: textValue(formData, "dateContacted") || undefined,
    followUpDate: textValue(formData, "followUpDate"),
    replyObjection: textValue(formData, "replyObjection"),
    trialCreated: formData.has("trialCreated") ? checkboxValue(formData, "trialCreated") : undefined,
    notes: textValue(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "update-validation"));
  }

  const values = parsed.data;

  const existing = await prisma.outreachProspect.findUnique({
    where: { id: values.outreachId },
    select: {
      id: true,
      firmName: true,
      status: true,
      trialCreated: true,
    },
  });

  if (!existing) {
    redirect(withError(returnTo, "missing"));
  }

  await prisma.outreachProspect.update({
    where: { id: values.outreachId },
    data: {
      firmName: values.firmName ?? existing.firmName,
      website: values.website,
      state: values.state,
      contactName: values.contactName,
      email: values.email,
      source: values.source,
      smallOfficeSignal: values.smallOfficeSignal,
      status: values.status ?? existing.status,
      dateContacted: asDate(values.dateContacted),
      followUpDate: asDate(values.followUpDate),
      replyObjection: values.replyObjection,
      trialCreated: values.trialCreated ?? existing.trialCreated,
      notes: values.notes,
    },
  });

  if (values.status) {
    await applyOutreachStatusTaskRules({
      outreachProspectId: values.outreachId,
      nextStatus: values.status,
      assignedToUserId: sessionUser.id,
    });
  }

  revalidatePath("/system/outreach");
  revalidatePath(`/system/outreach/${values.outreachId}`);
  redirect(withNotice(returnTo, "system-outreach-updated"));
}

export async function sendSystemOutreachEmail(formData: FormData) {
  const sessionUser = await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachSendSchema.safeParse({
    outreachId: textValue(formData, "outreachId"),
    templateKey: textValue(formData, "templateKey"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "send-validation"));
  }

  const values = parsed.data;
  if (!isOutreachEmailTemplateKey(values.templateKey)) {
    redirect(withError(returnTo, "send-template"));
  }

  const result = await sendOutreachTemplateEmail({
    outreachProspectId: values.outreachId,
    templateKey: values.templateKey,
    actor: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
    },
  });

  if (!result.ok) {
    const errorCode =
      result.errorCode === "missing"
        ? "missing"
        : result.errorCode === "template"
          ? "send-template"
          : result.errorCode === "email"
            ? "send-no-email"
            : result.errorCode === "recipient"
              ? "send-recipient"
              : "send-provider";
    redirect(withError(returnTo, errorCode));
  }

  revalidatePath("/system/outreach");
  revalidatePath(`/system/outreach/${values.outreachId}`);
  redirect(withNotice(returnTo, "system-outreach-email-sent"));
}

export async function completeSystemOutreachTask(formData: FormData) {
  await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachTaskActionSchema.safeParse({
    outreachTaskId: textValue(formData, "outreachTaskId"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "task-validation"));
  }

  await prisma.outreachTask.updateMany({
    where: {
      id: parsed.data.outreachTaskId,
      status: OutreachTaskStatus.OPEN,
    },
    data: {
      status: OutreachTaskStatus.DONE,
      completedAt: new Date(),
      skippedAt: null,
    },
  });

  revalidatePath("/system/outreach");
  revalidatePath(returnTo.split("?")[0]);
  redirect(withNotice(returnTo, "system-outreach-task-updated"));
}

export async function skipSystemOutreachTask(formData: FormData) {
  await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachTaskActionSchema.safeParse({
    outreachTaskId: textValue(formData, "outreachTaskId"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "task-validation"));
  }

  await prisma.outreachTask.updateMany({
    where: {
      id: parsed.data.outreachTaskId,
      status: OutreachTaskStatus.OPEN,
    },
    data: {
      status: OutreachTaskStatus.SKIPPED,
      skippedAt: new Date(),
      completedAt: null,
    },
  });

  revalidatePath("/system/outreach");
  revalidatePath(returnTo.split("?")[0]);
  redirect(withNotice(returnTo, "system-outreach-task-updated"));
}

export async function cancelSystemOutreachTask(formData: FormData) {
  await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachTaskActionSchema.safeParse({
    outreachTaskId: textValue(formData, "outreachTaskId"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "task-validation"));
  }

  await prisma.outreachTask.updateMany({
    where: {
      id: parsed.data.outreachTaskId,
      status: OutreachTaskStatus.OPEN,
    },
    data: {
      status: OutreachTaskStatus.CANCELLED,
      skippedAt: new Date(),
      completedAt: null,
    },
  });

  revalidatePath("/system/outreach");
  revalidatePath(returnTo.split("?")[0]);
  redirect(withNotice(returnTo, "system-outreach-task-updated"));
}

export async function markSystemOutreachCallAttempt(formData: FormData) {
  const sessionUser = await requireSystemOutreachContext();
  const returnTo = systemReturnToValue(formData, "/system/outreach");

  const parsed = outreachCallAttemptSchema.safeParse({
    outreachId: textValue(formData, "outreachId"),
    note: textValue(formData, "note"),
  });

  if (!parsed.success) {
    redirect(withError(returnTo, "task-validation"));
  }

  const prospect = await prisma.outreachProspect.findUnique({
    where: { id: parsed.data.outreachId },
    select: { id: true, firmName: true },
  });

  if (!prospect) {
    redirect(withError(returnTo, "missing"));
  }

  const now = new Date();
  await prisma.outreachActivity.create({
    data: {
      outreachProspectId: prospect.id,
      type: OutreachActivityType.NOTE,
      status: OutreachActivityStatus.NOTE,
      subject: "Call attempt logged",
      bodySnapshot: parsed.data.note || `Call attempt logged for ${prospect.firmName}.`,
      createdByUserId: sessionUser.id,
    },
  });

  await prisma.outreachTask.updateMany({
    where: {
      outreachProspectId: prospect.id,
      type: { in: [OutreachTaskType.CALL_ATTEMPT_1, OutreachTaskType.CALL_ATTEMPT_2] },
      status: OutreachTaskStatus.OPEN,
    },
    data: {
      status: OutreachTaskStatus.DONE,
      completedAt: now,
      skippedAt: null,
    },
  });

  revalidatePath("/system/outreach");
  revalidatePath(returnTo.split("?")[0]);
  redirect(withNotice(returnTo, "system-outreach-call-logged"));
}

export async function setSystemUserOutreachOperator(userId: string, workspaceId: string, nextOutreachOperator: boolean) {
  await requireSystemAdminContext();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firmId: true, isOutreachOperator: true },
  });

  if (!targetUser || targetUser.firmId !== workspaceId) {
    redirect(`/system/workspaces/${workspaceId}?error=user-missing`);
  }

  if (targetUser.isOutreachOperator !== nextOutreachOperator) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { isOutreachOperator: nextOutreachOperator },
    });
  }

  revalidatePath(`/system/workspaces/${workspaceId}`);
  revalidatePath("/system/outreach");
  redirect(withNotice(`/system/workspaces/${workspaceId}`, nextOutreachOperator ? "system-outreach-operator-enabled" : "system-outreach-operator-disabled"));
}

export async function inviteSystemOutreachOperator(formData: FormData) {
  const sessionUser = await requireSystemAdminContext();
  const returnTo = systemReturnToValue(formData, "/system/users");

  const name = requiredText.parse(formData.get("name")?.toString());
  const email = z.email().parse(formData.get("email")?.toString()).toLowerCase();
  const invitationNote = optionalText.parse(formData.get("note")?.toString())?.slice(0, 300);

  const adminFirm = await prisma.firm.findUnique({
    where: { id: sessionUser.firmId },
    select: { id: true, name: true },
  });

  if (!adminFirm) {
    redirect(withError(returnTo, "invite-missing-firm"));
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      isSystemAdmin: true,
      isOutreachOperator: true,
      firm: {
        select: {
          name: true,
        },
      },
    },
  });

  if (existingUser?.isSystemAdmin) {
    redirect(withError(returnTo, "invite-system-admin"));
  }

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: existingUser.name || name,
        active: true,
        isOutreachOperator: true,
      },
    });

    const inviteResult = await issueUserInvitation({
      userId: existingUser.id,
      userName: existingUser.name || name,
      userEmail: existingUser.email,
      workspaceName: existingUser.firm.name,
      invitationNote,
    });

    if (!inviteResult.ok) {
      redirect(withError(returnTo, "invite-send"));
    }

    revalidatePath("/system/users");
    revalidatePath("/system/outreach");
    revalidatePath("/system/workspaces");
    redirect(withNotice(returnTo, "system-outreach-operator-invite-updated"));
  }

  const createdUser = await prisma.user.create({
    data: {
      firmId: adminFirm.id,
      name,
      email,
      passwordHash: "",
      role: UserRole.ADJUSTER,
      active: true,
      isSystemAdmin: false,
      isOutreachOperator: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const inviteResult = await issueUserInvitation({
    userId: createdUser.id,
    userName: createdUser.name,
    userEmail: createdUser.email,
    workspaceName: adminFirm.name,
    invitationNote,
  });

  if (!inviteResult.ok) {
    await prisma.user.delete({ where: { id: createdUser.id } });
    redirect(withError(returnTo, "invite-send"));
  }

  revalidatePath("/system/users");
  revalidatePath("/system/outreach");
  revalidatePath("/system/workspaces");
  redirect(withNotice(returnTo, "system-outreach-operator-invite-created"));
}

export async function resendSystemOutreachOperatorInvite(userId: string) {
  await requireSystemAdminContext();
  const returnTo = "/system/users";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      isOutreachOperator: true,
      isSystemAdmin: true,
      firm: { select: { name: true } },
    },
  });

  if (!user || !user.active || !user.isOutreachOperator || user.isSystemAdmin) {
    redirect(withError(returnTo, "invite-missing"));
  }

  const inviteResult = await issueUserInvitation({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    workspaceName: user.firm.name,
  });

  if (!inviteResult.ok) {
    redirect(withError(returnTo, "invite-send"));
  }

  revalidatePath("/system/users");
  revalidatePath("/system/outreach");
  redirect(withNotice(returnTo, "system-outreach-operator-invite-resent"));
}

export type ResetSystemUserPasswordState = {
  error?: string;
  message?: string;
  temporaryPassword?: string;
};

export async function resetSystemUserPasswordWithState(
  _state: ResetSystemUserPasswordState,
  formData: FormData,
): Promise<ResetSystemUserPasswordState> {
  await requireSystemAdminContext();

  const userId = formData.get("userId")?.toString().trim() ?? "";
  const workspaceId = formData.get("workspaceId")?.toString().trim() ?? "";

  if (!userId || !workspaceId) {
    return { error: "Select a valid workspace user before resetting a password." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firmId: true, name: true, email: true },
  });

  if (!user || user.firmId !== workspaceId) {
    return { error: "That user is no longer available in this workspace." };
  }

  const temporaryPassword = generateTemporaryPassword();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(temporaryPassword),
    },
  });

  revalidatePath(`/system/workspaces/${workspaceId}`);

  return {
    message: `Password reset for ${user.name} (${user.email}). Share it securely and rotate after first sign-in.`,
    temporaryPassword,
  };
}

export async function setSystemUserActiveFromUsersPage(userId: string, active: boolean) {
  const sessionUser = await requireSystemAdminContext();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true, isSystemAdmin: true },
  });

  if (!targetUser) {
    redirect("/system/users?error=user-missing");
  }

  if (!active && targetUser.id === sessionUser.id) {
    redirect("/system/users?error=self-disable");
  }

  if (!active && targetUser.isSystemAdmin) {
    const activeAdminCount = await prisma.user.count({
      where: { isSystemAdmin: true, active: true },
    });
    if (activeAdminCount <= 1) {
      redirect("/system/users?error=last-admin");
    }
  }

  if (targetUser.active !== active) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { active },
    });
  }

  revalidatePath("/system/users");
  revalidatePath("/system/workspaces");
  redirect(withNotice("/system/users", active ? "system-user-activated" : "system-user-deactivated"));
}

export async function setSystemUserOutreachOperatorFromUsersPage(userId: string, enable: boolean) {
  await requireSystemAdminContext();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isSystemAdmin: true, isOutreachOperator: true },
  });

  if (!targetUser) {
    redirect("/system/users?error=user-missing");
  }

  if (targetUser.isSystemAdmin) {
    redirect("/system/users?error=system-admin-flag");
  }

  if (targetUser.isOutreachOperator !== enable) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { isOutreachOperator: enable },
    });
  }

  revalidatePath("/system/users");
  revalidatePath("/system/outreach");
  revalidatePath("/system/workspaces");
  redirect(withNotice("/system/users", enable ? "system-outreach-operator-enabled" : "system-outreach-operator-disabled"));
}

export async function resendSystemUserInviteFromUsersPage(userId: string) {
  await requireSystemAdminContext();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      firm: { select: { name: true } },
    },
  });

  if (!user || !user.active) {
    redirect("/system/users?error=user-missing");
  }

  const inviteResult = await issueUserInvitation({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    workspaceName: user.firm.name,
  });

  if (!inviteResult.ok) {
    redirect("/system/users?error=invite-send");
  }

  revalidatePath("/system/users");
  redirect(withNotice("/system/users", "user-invite-resent"));
}
