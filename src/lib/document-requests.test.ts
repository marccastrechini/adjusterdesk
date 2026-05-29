import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DocumentRequestStatus } from "@/generated/prisma/client";
import {
  documentRequestResolution,
  resolveDocumentRequestStatus,
  validateClientStatusUploadInput,
  validateDocumentCreateInput,
} from "./document-requests";

describe("document request helpers", () => {
  it("validates request creation and request-resolution input", () => {
    assert.equal(
      validateDocumentCreateInput({ requestedFromClient: true, title: "", hasUploadedFile: false }),
      "Name the document or photo you need from the client.",
    );

    assert.equal(
      validateDocumentCreateInput({ requestedFromClient: false, title: "", hasUploadedFile: false }),
      "Add a document title or choose a file before saving.",
    );

    assert.equal(
      validateDocumentCreateInput({ requestedFromClient: false, requestedDocumentId: "doc_1", title: "", hasUploadedFile: false }),
      "Add a title or choose a file before marking this request received.",
    );

    assert.equal(
      validateDocumentCreateInput({ requestedFromClient: false, requestedDocumentId: "doc_1", title: "Policy pages", hasUploadedFile: false }),
      undefined,
    );
  });

  it("resolves request status with legacy fallback", () => {
    assert.equal(resolveDocumentRequestStatus({ requestStatus: DocumentRequestStatus.NOT_NEEDED, requestedFromClient: false, receivedAt: null }), DocumentRequestStatus.NOT_NEEDED);
    assert.equal(resolveDocumentRequestStatus({ requestStatus: null, requestedFromClient: true, receivedAt: null }), DocumentRequestStatus.REQUESTED);
    assert.equal(resolveDocumentRequestStatus({ requestStatus: null, requestedFromClient: false, receivedAt: new Date() }), DocumentRequestStatus.RECEIVED);
    assert.equal(resolveDocumentRequestStatus({ requestStatus: null, requestedFromClient: false, receivedAt: null }), null);
  });

  it("builds status transitions for received and not needed", () => {
    const now = new Date("2026-05-29T12:00:00.000Z");
    const received = documentRequestResolution(DocumentRequestStatus.RECEIVED, now);
    const notNeeded = documentRequestResolution(DocumentRequestStatus.NOT_NEEDED, now);

    assert.equal(received.requestedFromClient, false);
    assert.equal(received.requestStatus, DocumentRequestStatus.RECEIVED);
    assert.equal(received.receivedAt?.toISOString(), now.toISOString());

    assert.equal(notNeeded.requestedFromClient, false);
    assert.equal(notNeeded.requestStatus, DocumentRequestStatus.NOT_NEEDED);
    assert.equal(notNeeded.receivedAt, null);
  });

  it("enforces conservative upload rules for client status", () => {
    assert.equal(validateClientStatusUploadInput({ size: 1024, mimeType: "application/pdf", fileName: "policy.pdf" }), undefined);
    assert.equal(validateClientStatusUploadInput({ size: 1024, mimeType: "text/plain", fileName: "notes.txt" }), "Use PDF, JPG, PNG, or WEBP files only.");
    assert.equal(validateClientStatusUploadInput({ size: 16 * 1024 * 1024, mimeType: "application/pdf", fileName: "large.pdf" }), "File is too large. Use a file up to 15 MB.");
  });
});
