"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActivityType, ClaimStatus, LeadStatus } from "@/generated/prisma/client";
import { getDemoContext } from "@/lib/app-context";
import {
  dateFromImportValue,
  normalizeImportType,
  parseImportCsv,
  validImportRows,
  type ImportPreview,
  type ImportRowValues,
  type ImportType,
} from "@/lib/import-utils";
import { prisma } from "@/lib/prisma";

export type SpreadsheetImportState = {
  message?: string;
  importType?: ImportType;
  fileName?: string;
  rawCsv?: string;
  preview?: ImportPreview;
};

const defaultReturnPath = "/start/import";

function errorState(message: string, importType?: ImportType): SpreadsheetImportState {
  return { message, importType };
}

function requestedReturnPath(formData: FormData) {
  const value = formData.get("returnPath")?.toString();
  return value?.startsWith("/") ? value : defaultReturnPath;
}

async function existingClaimNumbers(firmId: string, importType: ImportType) {
  if (importType !== "claims") return [];

  const claims = await prisma.claim.findMany({
    where: { firmId, claimNumber: { not: null } },
    select: { claimNumber: true },
  });

  return claims.map((claim) => claim.claimNumber).filter((claimNumber): claimNumber is string => Boolean(claimNumber));
}

async function previewCsvForFirm({ firmId, importType, csvText }: { firmId: string; importType: ImportType; csvText: string }) {
  const claimNumbers = await existingClaimNumbers(firmId, importType);
  return parseImportCsv(csvText, importType, { existingClaimNumbers: claimNumbers });
}

export async function previewSpreadsheetImport(_state: SpreadsheetImportState, formData: FormData): Promise<SpreadsheetImportState> {
  const { firm } = await getDemoContext();
  const importType = normalizeImportType(formData.get("importType")?.toString());

  if (!importType) {
    return errorState("Choose whether you are importing leads or claims.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorState("Choose a CSV file before reviewing the import.", importType);
  }

  const rawCsv = await file.text();
  let preview: ImportPreview;

  try {
    preview = await previewCsvForFirm({ firmId: firm.id, importType, csvText: rawCsv });
  } catch {
    return errorState("We could not read that file as CSV. Save it as a CSV file and try again.", importType);
  }

  if (preview.rows.length === 0) {
    return errorState("The CSV did not include any rows to import.", importType);
  }

  return {
    importType,
    fileName: file.name,
    rawCsv,
    preview,
  };
}

export async function confirmSpreadsheetImport(_state: SpreadsheetImportState, formData: FormData): Promise<SpreadsheetImportState> {
  const { firm, user } = await getDemoContext();
  const returnPath = requestedReturnPath(formData);
  const importType = normalizeImportType(formData.get("importType")?.toString());
  const rawCsv = formData.get("rawCsv")?.toString() ?? "";

  if (!importType) {
    return errorState("Choose whether you are importing leads or claims.");
  }

  if (!rawCsv.trim()) {
    return errorState("Review a CSV file before importing.", importType);
  }

  let preview: ImportPreview;
  try {
    preview = await previewCsvForFirm({ firmId: firm.id, importType, csvText: rawCsv });
  } catch {
    return errorState("We could not read that file as CSV. Save it as a CSV file and try again.", importType);
  }

  const validRows = validImportRows(preview);
  if (validRows.length === 0) {
    return {
      message: "No rows are ready to import yet. Fix the rows marked Needs work, then upload the CSV again.",
      importType,
      rawCsv,
      preview,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      const values = row.values;
      const contact = await tx.contact.create({
        data: {
          firmId: firm.id,
          firstName: requiredImportValue(values, "firstName"),
          lastName: requiredImportValue(values, "lastName"),
          email: emptyToUndefined(values.email),
          phone: emptyToUndefined(values.phone),
        },
      });

      const property = await tx.property.create({
        data: {
          firmId: firm.id,
          address1: requiredImportValue(values, "address1"),
          city: requiredImportValue(values, "city"),
          state: requiredImportValue(values, "state"),
          postalCode: requiredImportValue(values, "postalCode"),
        },
      });

      if (importType === "claims") {
        const carrier = values.carrierName
          ? (await tx.carrier.findFirst({ where: { firmId: firm.id, name: values.carrierName } })) ??
            (await tx.carrier.create({ data: { firmId: firm.id, name: values.carrierName } }))
          : undefined;

        const policy = values.policyNumber || values.claimNumber
          ? await tx.policy.create({
              data: {
                firmId: firm.id,
                carrierId: carrier?.id,
                policyNumber: values.policyNumber || "Policy to confirm",
                claimNumber: emptyToUndefined(values.claimNumber),
              },
            })
          : undefined;

        const claim = await tx.claim.create({
          data: {
            firmId: firm.id,
            contactId: contact.id,
            propertyId: property.id,
            carrierId: carrier?.id,
            policyId: policy?.id,
            assignedUserId: user.id,
            claimNumber: emptyToUndefined(values.claimNumber),
            lossType: requiredImportValue(values, "lossType"),
            dateOfLoss: dateFromImportValue(values.dateOfLoss),
            reportedDate: dateFromImportValue(values.reportedDate),
            inspectionDate: dateFromImportValue(values.inspectionDate),
            deadlineDate: dateFromImportValue(values.deadlineDate),
            status: ClaimStatus.NEW,
            nextStep: "Review imported claim details.",
            notes: emptyToUndefined(values.notes),
          },
        });

        await tx.activity.create({
          data: {
            firmId: firm.id,
            claimId: claim.id,
            contactId: contact.id,
            userId: user.id,
            type: ActivityType.NOTE,
            subject: "Imported from spreadsheet",
            body: "Starter claim details were imported from a spreadsheet. Review carrier, policy, deadline, and next-step details before daily use.",
          },
        });
      } else {
        const lead = await tx.lead.create({
          data: {
            firmId: firm.id,
            contactId: contact.id,
            propertyId: property.id,
            assignedUserId: user.id,
            source: requiredImportValue(values, "source"),
            referralSource: emptyToUndefined(values.referralSource),
            lossType: requiredImportValue(values, "lossType"),
            dateOfLoss: dateFromImportValue(values.dateOfLoss),
            followUpDate: dateFromImportValue(values.followUpDate),
            status: LeadStatus.NEW,
            notes: emptyToUndefined(values.notes),
          },
        });

        await tx.activity.create({
          data: {
            firmId: firm.id,
            leadId: lead.id,
            contactId: contact.id,
            userId: user.id,
            type: ActivityType.NOTE,
            subject: "Imported from spreadsheet",
            body: "Starter lead details were imported from a spreadsheet. Review follow-up and contact details before daily use.",
          },
        });
      }
    }
  });

  revalidatePath("/start");
  revalidatePath("/start/import");
  revalidatePath("/settings/import");
  revalidatePath(importType === "claims" ? "/claims" : "/leads");

  redirect(`${returnPath}?imported=${validRows.length}&skipped=${preview.invalidCount}&type=${importType}`);
}

function emptyToUndefined(value: string | undefined) {
  return value?.trim() || undefined;
}

function requiredImportValue(values: ImportRowValues, key: keyof ImportRowValues) {
  return values[key]?.trim() ?? "";
}