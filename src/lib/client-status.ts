import { ClaimStatus, DocumentRequestStatus, type DocumentCategory } from "@/generated/prisma/client";
import { resolveDocumentRequestStatus } from "@/lib/document-requests";
import { formatDate, formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";

export const clientSummaryMaxLength = 600;
export const clientNextStepMaxLength = 280;
export const clientStatusUploadMarker = "Uploaded from the client status page.";

type ClientStatusTone = "slate" | "green" | "amber" | "red" | "blue" | "teal";

type ClientStatusFirm = {
  name: string;
  phone?: string | null;
  email?: string | null;
};

type ClientStatusDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  requestStatus?: DocumentRequestStatus | null;
  notes?: string | null;
  clientVisibleNote?: string | null;
  clientProvided?: boolean;
  requestedFromClient: boolean;
  receivedAt?: Date | string | null;
  createdAt: Date | string;
};

export type ClientStatusClaim = {
  id: string;
  status: ClaimStatus;
  lossType: string;
  dateOfLoss?: Date | string | null;
  publicSummary?: string | null;
  nextStep?: string | null;
  updatedAt: Date | string;
  contact: { firstName: string; lastName: string };
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    postalCode: string;
  };
  assignedUser?: { name: string } | null;
  documents: ClientStatusDocument[];
};

export type ClientStatusViewModel = {
  firm: ClientStatusFirm;
  clientName: string;
  heading: string;
  statusLabel: string;
  statusTone: ClientStatusTone;
  propertyAddress: string;
  lossType: string;
  dateOfLoss: string;
  lastUpdateText: string;
  lastUpdatedAt: string;
  nextStep?: string;
  requestedDocuments: Array<{
    id: string;
    title: string;
    categoryLabel: string;
    statusLabel: "Requested" | "Received" | "Not needed";
    tone: "amber" | "green" | "slate";
    note?: string;
    clientProvided?: boolean;
  }>;
  officeContact: {
    adjuster: string;
    phone: string;
    email: string;
  };
  lastViewedAt?: string;
};

export type ClientStatusUpdateInput = {
  publicSummary: string;
  nextStep: string;
  status?: string;
};

export function clientStatusLinkState(link: { isActive: boolean }) {
  return link.isActive ? "active" : "disabled";
}

export function clientStatusTone(status: ClaimStatus | string): ClientStatusTone {
  if (status === ClaimStatus.SETTLED || status === ClaimStatus.CLOSED) return "green";
  if (status === ClaimStatus.WAITING_ON_CARRIER || status === ClaimStatus.WAITING_ON_CLIENT) return "amber";
  return "teal";
}

export function validateClientStatusUpdateInput(input: ClientStatusUpdateInput) {
  const publicSummary = input.publicSummary.trim();
  const nextStep = input.nextStep.trim();
  const errors: Record<string, string> = {};

  if (publicSummary.length > clientSummaryMaxLength) {
    errors.publicSummary = `Keep the client-facing summary under ${clientSummaryMaxLength} characters.`;
  }

  if (nextStep.length > clientNextStepMaxLength) {
    errors.nextStep = `Keep the next step under ${clientNextStepMaxLength} characters.`;
  }

  const status = input.status && Object.values(ClaimStatus).includes(input.status as ClaimStatus) ? (input.status as ClaimStatus) : undefined;
  if (input.status && !status) {
    errors.status = "Choose a valid claim status.";
  }

  return {
    data: {
      publicSummary: publicSummary || null,
      nextStep: nextStep || null,
      status,
    },
    errors,
  };
}

function clientVisibleDocumentNote(notes?: string | null) {
  if (!notes || !notes.includes(clientStatusUploadMarker)) return undefined;
  const [visibleNote] = notes.split(clientStatusUploadMarker);
  return visibleNote.trim() || undefined;
}

function isClientVisibleDocument(document: ClientStatusDocument) {
  if (document.requestStatus) return true;
  if (document.clientProvided) return true;
  return document.requestedFromClient || Boolean(document.receivedAt && document.notes?.includes(clientStatusUploadMarker));
}

function clientDocumentStatus(document: ClientStatusDocument) {
  const status = resolveDocumentRequestStatus(document);

  if (status === DocumentRequestStatus.REQUESTED) {
    return { statusLabel: "Requested" as const, tone: "amber" as const };
  }

  if (status === DocumentRequestStatus.NOT_NEEDED) {
    return { statusLabel: "Not needed" as const, tone: "slate" as const };
  }

  return { statusLabel: "Received" as const, tone: "green" as const };
}

export function buildClientStatusViewModel({
  firm,
  claim,
  lastViewedAt,
}: {
  firm: ClientStatusFirm;
  claim: ClientStatusClaim;
  lastViewedAt?: Date | string | null;
}): ClientStatusViewModel {
  return {
    firm,
    clientName: fullName(claim.contact),
    heading: `${fullName(claim.contact)} claim status`,
    statusLabel: labelFromEnum(claim.status),
    statusTone: clientStatusTone(claim.status),
    propertyAddress: propertyAddress(claim.property),
    lossType: claim.lossType,
    dateOfLoss: formatDate(claim.dateOfLoss),
    lastUpdateText: claim.publicSummary?.trim() || "The office is tracking this claim and will update the next step as work progresses.",
    lastUpdatedAt: formatDateTime(claim.updatedAt),
    nextStep: claim.nextStep?.trim() || undefined,
    requestedDocuments: claim.documents.filter(isClientVisibleDocument).map((document) => {
      const status = clientDocumentStatus(document);
      return {
        id: document.id,
        title: document.title,
        categoryLabel: labelFromEnum(document.category),
        statusLabel: status.statusLabel,
        tone: status.tone,
        note: document.clientVisibleNote?.trim() || clientVisibleDocumentNote(document.notes),
        clientProvided: Boolean(document.clientProvided || document.notes?.includes(clientStatusUploadMarker)),
      };
    }),
    officeContact: {
      adjuster: claim.assignedUser?.name ?? "Office team",
      phone: firm.phone ?? "Phone not set",
      email: firm.email ?? "Email not set",
    },
    lastViewedAt: lastViewedAt ? formatDateTime(lastViewedAt) : undefined,
  };
}