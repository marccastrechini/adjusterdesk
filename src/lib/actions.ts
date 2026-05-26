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
import { withNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const requiredText = z.string().trim().min(1, "Required");

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

export async function createTask(formData: FormData) {
  const { firm } = await getDemoContext();
  const claimId = formData.get("claimId")?.toString() || undefined;
  const leadId = formData.get("leadId")?.toString() || undefined;
  const returnPath = formData.get("returnPath")?.toString() || "/today";

  await prisma.task.create({
    data: {
      firmId: firm.id,
      claimId,
      leadId,
      assignedUserId: formData.get("assignedUserId")?.toString() || undefined,
      title: requiredText.parse(formData.get("title")?.toString()),
      notes: formData.get("notes")?.toString() || undefined,
      priority: (formData.get("priority")?.toString() as TaskPriority) || TaskPriority.NORMAL,
      dueDate: asDate(formData.get("dueDate")?.toString()),
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, "task-created"));
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
  const upload = file instanceof File && file.size > 0 ? await saveUploadedFile(file) : {};
  const fallbackTitle = file instanceof File && file.name ? file.name : "Document";

  const requestedFromClient = formData.get("requestedFromClient") === "on";

  await prisma.document.create({
    data: {
      firmId: firm.id,
      claimId,
      leadId,
      uploadedByUserId: user.id,
      category: (formData.get("category")?.toString() as DocumentCategory) || DocumentCategory.OTHER,
      title: formData.get("title")?.toString() || fallbackTitle,
      notes: formData.get("notes")?.toString() || undefined,
      requestedFromClient,
      receivedAt: new Date(),
      ...upload,
    },
  });

  revalidatePath(returnPath);
  redirect(withNotice(returnPath, requestedFromClient ? "document-requested" : "document-added"));
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

export async function createUser(formData: FormData) {
  const { firm } = await getDemoContext();
  await prisma.user.create({
    data: {
      firmId: firm.id,
      name: requiredText.parse(formData.get("name")?.toString()),
      email: requiredText.parse(formData.get("email")?.toString()),
      role: (formData.get("role")?.toString() as UserRole) || UserRole.ADJUSTER,
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function importCsv(formData: FormData) {
  const { firm, user } = await getDemoContext();
  const importType = formData.get("importType")?.toString();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to import.");

  const text = await file.text();
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
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

  revalidatePath(importType === "claims" ? "/claims" : "/leads");
  redirect(`/settings/import?imported=${created}&type=${importType === "claims" ? "claims" : "leads"}`);
}

export async function uploadStatusDocument(token: string, formData: FormData) {
  const statusLink = await prisma.clientStatusLink.findUnique({ where: { token }, include: { claim: true } });
  if (!statusLink || !statusLink.isActive) throw new Error("Status page is not available.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");

  const upload = await saveUploadedFile(file);
  await prisma.document.create({
    data: {
      firmId: statusLink.firmId,
      claimId: statusLink.claimId,
      category: DocumentCategory.OTHER,
      title: formData.get("title")?.toString() || file.name,
      notes: "Uploaded from the client status page.",
      receivedAt: new Date(),
      ...upload,
    },
  });

  revalidatePath(`/status/${token}`);
  redirect(`/status/${token}`);
}
