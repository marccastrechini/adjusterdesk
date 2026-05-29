import { DocumentRequestStatus } from "@/generated/prisma/client";

type MaybeText = string | null | undefined;

export const clientStatusUploadMaxBytes = 15 * 1024 * 1024;

const clientStatusAllowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type DocumentRequestShape = {
  requestStatus?: DocumentRequestStatus | null;
  requestedFromClient: boolean;
  receivedAt?: Date | string | null;
};

export function resolveDocumentRequestStatus(document: DocumentRequestShape): DocumentRequestStatus | null {
  if (document.requestStatus) return document.requestStatus;
  if (document.requestedFromClient) return DocumentRequestStatus.REQUESTED;
  if (document.receivedAt) return DocumentRequestStatus.RECEIVED;
  return null;
}

function hasText(value: MaybeText) {
  return Boolean(value?.trim());
}

export function validateDocumentCreateInput(input: {
  requestedFromClient: boolean;
  requestedDocumentId?: MaybeText;
  title?: MaybeText;
  hasUploadedFile: boolean;
}) {
  const hasTitle = hasText(input.title);
  const requestedDocumentId = input.requestedDocumentId?.trim();

  if (requestedDocumentId && !input.hasUploadedFile && !hasTitle) {
    return "Add a title or choose a file before marking this request received.";
  }

  if (input.requestedFromClient && !hasTitle) {
    return "Name the document or photo you need from the client.";
  }

  if (!input.requestedFromClient && !hasTitle && !input.hasUploadedFile) {
    return "Add a document title or choose a file before saving.";
  }

  return undefined;
}

export function documentRequestResolution(status: DocumentRequestStatus, now = new Date()) {
  return {
    requestedFromClient: false,
    requestStatus: status,
    receivedAt: status === DocumentRequestStatus.RECEIVED ? now : null,
  };
}

export function validateClientStatusUploadInput(input: { size: number; mimeType?: string; fileName: string }) {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return "Choose a file to upload.";
  }

  if (input.size > clientStatusUploadMaxBytes) {
    return "File is too large. Use a file up to 15 MB.";
  }

  const mimeType = input.mimeType?.toLowerCase().trim() ?? "";
  const fileName = input.fileName.toLowerCase();
  const allowedByType = mimeType.length > 0 && clientStatusAllowedMimeTypes.has(mimeType);
  const allowedByExtension = /\.(pdf|jpg|jpeg|png|webp)$/i.test(fileName);

  if (!allowedByType && !allowedByExtension) {
    return "Use PDF, JPG, PNG, or WEBP files only.";
  }

  return undefined;
}
