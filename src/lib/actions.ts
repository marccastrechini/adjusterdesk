"use server";

import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ActivityType,
  ClaimStatus,
  DocumentCategory,
  InvoiceStatus,
  LeadStatus,
  SettlementStatus,
  TaskPriority,
  TaskStatus,
  TemplateType,
  UserRole,
} from "@/generated/prisma/client";
import { getDemoContext } from "@/lib/app-context";
import { hashPassword } from "@/lib/auth";
import { formError, type ActionFormState, type FieldErrors } from "@/lib/form-state";
import { withNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { generateClientStatusToken } from "@/lib/status-links";
import { saveUploadedFile, validateUploadFile } from "@/lib/storage";
import { documentInputFromTemplate, taskInputFromTemplate } from "@/lib/templates";
import { hasUsableCsvRows, normalizeImportType } from "@/lib/import-utils";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const requiredText = z.string().trim().min(1, "Required");
const clientSummaryMaxLength = 600;
const clientNextStepMaxLength = 280;

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

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
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

async function findOrCreateCarrier(firmId: string, name?: string) {
  if (!name) return undefined;
  const existing = await prisma.carrier.findFirst({ where: { firmId, name } });
  if (existing) return existing;
  return prisma.carrier.create({ data: { firmId, name } });
}

export async function createLead(formData: FormData) {
  const { firm } = await getDemoContext();
  const input = leadSchema.parse(formObject(formData));

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
        assignedUserId: input.assignedUserId,
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
          assignedUserId: input.assignedUserId,
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
  redirect(withNotice(`/claims/${claim.id}`, "lead-converted"));
}

export async function convertLeadToClaimWithState(leadId: string, _state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  await convertLeadToClaim(leadId, formData);
  return {};
}

export async function createClaim(formData: FormData) {
  const { firm } = await getDemoContext();
  const input = claimSchema.parse(formObject(formData));

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
        assignedUserId: input.assignedUserId,
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
  redirect(withNotice(`/claims/${claim.id}`, "claim-created"));
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
  const { firm } = await getDemoContext();
  const errors: FieldErrors = {};
  const publicSummary = textValue(formData, "publicSummary");
  const nextStep = textValue(formData, "nextStep");
  const status = formData.get("status")?.toString() as ClaimStatus | undefined;
  const returnPath = `/claims/${claimId}/client-status`;

  if (publicSummary.length > clientSummaryMaxLength) {
    errors.publicSummary = `Keep the client-facing summary under ${clientSummaryMaxLength} characters.`;
  }

  if (nextStep.length > clientNextStepMaxLength) {
    errors.nextStep = `Keep the next step under ${clientNextStepMaxLength} characters.`;
  }

  if (status && !Object.values(ClaimStatus).includes(status)) {
    errors.status = "Choose a valid claim status.";
  }

  if (hasErrors(errors)) {
    return formError("Shorten the client-facing status update before saving.", errors);
  }

  const claim = await prisma.claim.findFirst({
    where: { id: claimId, firmId: firm.id },
    include: { statusLinks: { select: { token: true } } },
  });
  if (!claim) throw new Error("Claim not found.");

  await prisma.claim.update({
    where: { id: claim.id },
    data: {
      publicSummary: publicSummary || null,
      nextStep: nextStep || null,
      status: status || claim.status,
    },
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
  const { firm } = await getDemoContext();
  const returnPath = `/claims/${claimId}/client-status`;
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, firmId: firm.id },
    select: { id: true },
  });
  if (!claim) throw new Error("Claim not found.");

  const token = await generateUniqueClientStatusToken();
  const statusLink = await prisma.clientStatusLink.create({
    data: {
      firmId: firm.id,
      claimId: claim.id,
      token,
      isActive: true,
    },
  });

  revalidatePath(returnPath);
  revalidatePath(`/status/${statusLink.token}`);
  redirect(withNotice(returnPath, "client-link-created"));
}

async function updateClientStatusLinkActive(claimId: string, linkId: string, isActive: boolean) {
  const { firm } = await getDemoContext();
  const returnPath = `/claims/${claimId}/client-status`;
  const statusLink = await prisma.clientStatusLink.findFirst({
    where: { id: linkId, claimId, firmId: firm.id },
  });
  if (!statusLink) throw new Error("Client status link not found.");

  await prisma.clientStatusLink.update({ where: { id: statusLink.id }, data: { isActive } });

  revalidatePath(returnPath);
  revalidatePath(`/claims/${claimId}`);
  revalidatePath(`/status/${statusLink.token}`);
  redirect(withNotice(returnPath, isActive ? "client-link-reactivated" : "client-link-paused"));
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
  const { firm } = await getDemoContext();
  const claimId = formData.get("claimId")?.toString() || undefined;
  const leadId = formData.get("leadId")?.toString() || undefined;
  const returnPath = formData.get("returnPath")?.toString() || "/today";
  const taskInput = taskInputFromTemplate({
    templateKey: formData.get("taskTemplateKey")?.toString(),
    title: formData.get("title")?.toString(),
    notes: formData.get("notes")?.toString(),
    priority: formData.get("priority")?.toString(),
  });

  await prisma.task.create({
    data: {
      firmId: firm.id,
      claimId,
      leadId,
      assignedUserId: formData.get("assignedUserId")?.toString() || undefined,
      title: requiredText.parse(taskInput.title),
      notes: taskInput.notes,
      priority: taskInput.priority,
      dueDate: asDate(formData.get("dueDate")?.toString()),
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "task-created"));
}

export async function createTaskWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  const taskInput = taskInputFromTemplate({
    templateKey: formData.get("taskTemplateKey")?.toString(),
    title: formData.get("title")?.toString(),
    notes: formData.get("notes")?.toString(),
    priority: formData.get("priority")?.toString(),
  });

  if (!taskInput.title) errors.title = "Choose a common task or add a short task name.";

  if (hasErrors(errors)) {
    return formError("Choose a common task or add a task name before saving this follow-up.", errors);
  }

  await createTask(formData);
  return {};
}

export async function updateTask(taskId: string, returnPath: string, formData: FormData) {
  const { firm } = await getDemoContext();
  await prisma.task.updateMany({
    where: { id: taskId, firmId: firm.id },
    data: {
      title: requiredText.parse(formData.get("title")?.toString()),
      notes: formData.get("notes")?.toString() || undefined,
      assignedUserId: formData.get("assignedUserId")?.toString() || undefined,
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
  const { firm } = await getDemoContext();
  const task = await prisma.task.findFirst({ where: { id: taskId, firmId: firm.id } });
  if (!task) throw new Error("Task not found.");

  const done = task.status === TaskStatus.DONE;
  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: done ? TaskStatus.OPEN : TaskStatus.DONE,
      completedAt: done ? null : new Date(),
    },
  });

  revalidatePath(returnPath);
}

export async function createDocument(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const claimId = formData.get("claimId")?.toString() || undefined;
  const leadId = formData.get("leadId")?.toString() || undefined;
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

  await prisma.document.create({
    data: {
      firmId: firm.id,
      claimId,
      leadId,
      uploadedByUserId: user.id,
      category: documentInput.category,
      title: documentInput.title || fallbackTitle,
      notes: documentInput.notes,
      requestedFromClient: documentInput.requestedFromClient,
      receivedAt: new Date(),
      ...upload,
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, documentInput.requestedFromClient ? "document-requested" : "document-added"));
}

export async function createDocumentWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  const hasUploadedFile = hasFile(formData, "file");
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
  const hasTitle = Boolean(documentInput.title);

  if (requestedFromClient && !hasTitle) {
    errors.title = "Name the document or photo you need from the client.";
  } else if (!requestedFromClient && !hasTitle && !hasUploadedFile) {
    errors.title = "Add a document title or choose a file before saving.";
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

export async function createActivity(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const returnPath = formData.get("returnPath")?.toString() || "/claims";

  await prisma.activity.create({
    data: {
      firmId: firm.id,
      claimId: formData.get("claimId")?.toString() || undefined,
      leadId: formData.get("leadId")?.toString() || undefined,
      contactId: formData.get("contactId")?.toString() || undefined,
      userId: user.id,
      type: (formData.get("type")?.toString() as ActivityType) || ActivityType.NOTE,
      subject: requiredText.parse(formData.get("subject")?.toString()),
      body: formData.get("body")?.toString() || undefined,
      occurredAt: asDateTime(formData.get("occurredAt")?.toString()) ?? new Date(),
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "note-added"));
}

export async function createActivityWithState(_state: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const errors: FieldErrors = {};
  requiredField(formData, "subject", "Add a short subject for this note.", errors);

  if (hasErrors(errors)) {
    return formError("Add a short subject before saving this note.", errors);
  }

  await createActivity(formData);
  return {};
}

export async function createSettlementRound(formData: FormData) {
  const { firm } = await getDemoContext();
  const claimId = requiredText.parse(formData.get("claimId")?.toString());
  const returnPath = formData.get("returnPath")?.toString() || `/claims/${claimId}/money`;
  const existingCount = await prisma.settlementRound.count({ where: { firmId: firm.id, claimId } });
  const status = (formData.get("status")?.toString() as SettlementStatus) || SettlementStatus.OFFER_RECEIVED;
  const acceptedAmountCents = centsFromInput(formData.get("acceptedAmount"));

  await prisma.$transaction(async (tx) => {
    await tx.settlementRound.create({
      data: {
        firmId: firm.id,
        claimId,
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
      await tx.claim.update({ where: { id: claimId }, data: { status: ClaimStatus.SETTLED } });
    }
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
  const { firm } = await getDemoContext();
  const claimId = requiredText.parse(formData.get("claimId")?.toString());
  const invoiceId = formData.get("invoiceId")?.toString() || undefined;
  const returnPath = formData.get("returnPath")?.toString() || `/claims/${claimId}/money`;
  const amountCents = centsFromInput(formData.get("amount"));

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        firmId: firm.id,
        claimId,
        invoiceId,
        amountCents,
        paidAt: asDate(formData.get("paidAt")?.toString()) ?? new Date(),
        checkNumber: formData.get("checkNumber")?.toString() || undefined,
        payee: requiredText.parse(formData.get("payee")?.toString()),
        notes: formData.get("notes")?.toString() || undefined,
      },
    });

    if (invoiceId) {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, firmId: firm.id } });
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
  const { firm } = await getDemoContext();
  const claimId = requiredText.parse(formData.get("claimId")?.toString());
  const returnPath = formData.get("returnPath")?.toString() || `/claims/${claimId}/money`;
  const settlementAmountCents = centsFromInput(formData.get("settlementAmount"));
  const feePercentageBasisPoints = basisPointsFromPercent(formData.get("feePercent"));
  const feeAmountCents = Math.round((settlementAmountCents * feePercentageBasisPoints) / 10000);
  const feeRule = await prisma.feeRule.findFirst({ where: { firmId: firm.id, active: true } });

  await prisma.invoice.create({
    data: {
      firmId: firm.id,
      claimId,
      feeRuleId: feeRule?.id,
      invoiceNumber: requiredText.parse(formData.get("invoiceNumber")?.toString()),
      status: (formData.get("status")?.toString() as InvoiceStatus) || InvoiceStatus.DRAFT,
      settlementAmountCents,
      feePercentageBasisPoints,
      feeAmountCents,
      issuedAt: asDate(formData.get("issuedAt")?.toString()) ?? new Date(),
      dueAt: asDate(formData.get("dueAt")?.toString()),
      notes: formData.get("notes")?.toString() || undefined,
    },
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

export async function createUser(formData: FormData) {
  const { firm } = await getDemoContext();
  const password = formData.get("password")?.toString() ?? "";

  if (password.trim().length < 8) {
    redirect("/settings/users?error=password");
  }

  await prisma.user.create({
    data: {
      firmId: firm.id,
      name: requiredText.parse(formData.get("name")?.toString()),
      email: requiredText.parse(formData.get("email")?.toString()).toLowerCase(),
      passwordHash: hashPassword(password),
      role: (formData.get("role")?.toString() as UserRole) || UserRole.ADJUSTER,
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/settings/users");
  revalidatePath("/settings");
  redirect("/settings/users");
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

export async function importCsv(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const importType = normalizeImportType(formData.get("importType")?.toString());
  if (!importType) redirect("/settings/import?error=import-type");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`/settings/import?error=file&type=${importType}`);

  const text = await file.text();
  let records: Record<string, string>[] = [];
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  } catch {
    redirect(`/settings/import?error=csv&type=${importType}`);
  }

  if (!hasUsableCsvRows(records)) {
    redirect(`/settings/import?error=rows&type=${importType}`);
  }

  let created = 0;

  for (const record of records) {
    const firstName = record.firstName || record["First Name"] || "Unknown";
    const lastName = record.lastName || record["Last Name"] || "Client";
    const contact = await prisma.contact.create({
      data: {
        firmId: firm.id,
        firstName,
        lastName,
        email: record.email || record.Email || undefined,
        phone: record.phone || record.Phone || undefined,
      },
    });

    const property = await prisma.property.create({
      data: {
        firmId: firm.id,
        address1: record.address1 || record.Address || "Address to confirm",
        city: record.city || record.City || "City",
        state: record.state || record.State || "FL",
        postalCode: record.postalCode || record.Zip || "00000",
      },
    });

    if (importType === "claims") {
      const carrier = await findOrCreateCarrier(firm.id, record.carrierName || record.Carrier || undefined);
      const policyNumber = record.policyNumber || record.Policy || "Policy to confirm";
      const policy = await prisma.policy.create({
        data: {
          firmId: firm.id,
          carrierId: carrier?.id,
          policyNumber,
          claimNumber: record.claimNumber || record["Claim Number"] || undefined,
        },
      });

      await prisma.claim.create({
        data: {
          firmId: firm.id,
          contactId: contact.id,
          propertyId: property.id,
          carrierId: carrier?.id,
          policyId: policy.id,
          assignedUserId: user.id,
          claimNumber: record.claimNumber || record["Claim Number"] || undefined,
          lossType: record.lossType || record["Loss Type"] || "Loss to confirm",
          dateOfLoss: asDate(record.dateOfLoss || record["Date of Loss"]),
          status: ClaimStatus.NEW,
          nextStep: "Review imported claim details.",
        },
      });
    } else {
      await prisma.lead.create({
        data: {
          firmId: firm.id,
          contactId: contact.id,
          propertyId: property.id,
          assignedUserId: user.id,
          source: record.source || record.Source || "CSV import",
          referralSource: record.referralSource || record.Referral || undefined,
          lossType: record.lossType || record["Loss Type"] || "Loss to confirm",
          dateOfLoss: asDate(record.dateOfLoss || record["Date of Loss"]),
          status: LeadStatus.NEW,
          followUpDate: asDate(record.followUpDate || record["Follow Up"]),
          notes: record.notes || record.Notes || undefined,
        },
      });
    }

    created += 1;
  }

  if (created === 0) {
    redirect(`/settings/import?error=rows&type=${importType}`);
  }

  revalidatePath(importType === "claims" ? "/claims" : "/leads");
  redirect(`/settings/import?imported=${created}&type=${importType}`);
}

export async function uploadStatusDocument(token: string, formData: FormData) {
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
  const fileError = validateUploadFile(file);
  if (fileError) throw new Error(fileError);

  const requestedDocumentId = formData.get("requestedDocumentId")?.toString() || undefined;
  const replacementTitle = formData.get("title")?.toString().trim() || undefined;
  const uploadedNote = "Uploaded from the client status page.";

  if (requestedDocumentId) {
    const requestedDocument = statusLink.claim.documents.find(
      (document) => document.id === requestedDocumentId && document.requestedFromClient && document.firmId === statusLink.firmId,
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
        requestedFromClient: false,
        receivedAt: new Date(),
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
        receivedAt: new Date(),
        ...upload,
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

  const fileError = validateUploadFile(file);
  if (fileError) {
    return formError(fileError, { file: fileError });
  }

  await uploadStatusDocument(token, formData);
  return {};
}
