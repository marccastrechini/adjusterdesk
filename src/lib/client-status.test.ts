import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ClaimStatus, DocumentCategory, DocumentRequestStatus } from "@/generated/prisma/client";
import {
  buildClientStatusViewModel,
  clientNextStepMaxLength,
  clientStatusLinkState,
  clientStatusUploadMarker,
  validateClientStatusUpdateInput,
  type ClientStatusClaim,
} from "./client-status";

describe("client status view model", () => {
  const baseClaim: ClientStatusClaim = {
    id: "claim_1",
    status: ClaimStatus.WAITING_ON_CLIENT,
    lossType: "Water damage",
    dateOfLoss: new Date("2026-05-01T12:00:00"),
    publicSummary: "We are waiting on the policy pages before the next carrier follow-up.",
    nextStep: "Please send the policy declarations page.",
    updatedAt: new Date("2026-05-04T15:30:00"),
    contact: { firstName: "Jamie", lastName: "Cole" },
    property: { address1: "120 Bay Street", address2: null, city: "Tampa", state: "FL", postalCode: "33602" },
    assignedUser: { name: "Dana Morris" },
    documents: [
      {
        id: "requested_doc",
        title: "Policy declarations page",
        category: DocumentCategory.POLICY,
        requestStatus: DocumentRequestStatus.REQUESTED,
        clientVisibleNote: "Please send the declarations page when you can.",
        notes: "Internal office note should not be shown.",
        clientProvided: false,
        requestedFromClient: true,
        receivedAt: null,
        createdAt: new Date("2026-05-02T12:00:00"),
      },
      {
        id: "received_doc",
        title: "Kitchen photos",
        category: DocumentCategory.PHOTOS,
        requestStatus: DocumentRequestStatus.RECEIVED,
        clientVisibleNote: "Photo request",
        notes: `Internal upload trail\n${clientStatusUploadMarker}`,
        clientProvided: true,
        requestedFromClient: false,
        receivedAt: new Date("2026-05-03T12:00:00"),
        createdAt: new Date("2026-05-02T12:00:00"),
      },
      {
        id: "not_needed_doc",
        title: "Mortgage company information",
        category: DocumentCategory.OTHER,
        requestStatus: DocumentRequestStatus.NOT_NEEDED,
        clientVisibleNote: "No mortgage company is involved on this claim.",
        notes: "Internal closure detail.",
        clientProvided: false,
        requestedFromClient: false,
        receivedAt: null,
        createdAt: new Date("2026-05-03T12:00:00"),
      },
      {
        id: "private_doc",
        title: "Private estimate strategy",
        category: DocumentCategory.ESTIMATE,
        notes: "Do not show this internal estimate note.",
        clientVisibleNote: null,
        requestStatus: null,
        clientProvided: false,
        requestedFromClient: false,
        receivedAt: new Date("2026-05-03T12:00:00"),
        createdAt: new Date("2026-05-02T12:00:00"),
      },
    ],
  };

  it("builds only client-visible claim status fields", () => {
    const claimWithPrivateFields = {
      ...baseClaim,
      claimNumber: "PRIVATE-CLAIM-NUMBER",
      notes: "Internal admin note that should not render.",
      tasks: [{ title: "Internal task call carrier desk adjuster" }],
      invoices: [{ invoiceNumber: "PRIVATE-INVOICE" }],
      activities: [{ subject: "Internal activity", body: "Settlement strategy" }],
    };

    const model = buildClientStatusViewModel({
      firm: { name: "Harbor Public Adjusting", phone: "(813) 555-0100", email: "help@example.com" },
      claim: claimWithPrivateFields,
    });
    const serialized = JSON.stringify(model);

    assert.equal(model.heading, "Jamie Cole claim status");
    assert.equal(model.statusLabel, "Waiting On Client");
    assert.equal(model.requestedDocuments.length, 3);
    assert.equal(model.requestedDocuments[0]?.statusLabel, "Requested");
    assert.equal(model.requestedDocuments[1]?.statusLabel, "Received");
    assert.equal(model.requestedDocuments[2]?.statusLabel, "Not needed");
    assert.equal(model.requestedDocuments[1]?.clientProvided, true);
    assert.doesNotMatch(serialized, /PRIVATE-CLAIM-NUMBER/);
    assert.doesNotMatch(serialized, /Internal admin note/);
    assert.doesNotMatch(serialized, /Internal task/);
    assert.doesNotMatch(serialized, /PRIVATE-INVOICE/);
    assert.doesNotMatch(serialized, /Settlement strategy/);
    assert.doesNotMatch(serialized, /Private estimate strategy/);
    assert.doesNotMatch(serialized, /Internal office note should not be shown/);
    assert.doesNotMatch(serialized, /Internal upload trail/);
    assert.doesNotMatch(serialized, new RegExp(clientStatusUploadMarker));
  });

  it("describes disabled link behavior", () => {
    assert.equal(clientStatusLinkState({ isActive: true }), "active");
    assert.equal(clientStatusLinkState({ isActive: false }), "disabled");
  });

  it("validates client-visible status updates", () => {
    const valid = validateClientStatusUpdateInput({
      publicSummary: "  Inspection is scheduled for Friday.  ",
      nextStep: "  We will call after the inspection.  ",
      status: ClaimStatus.IN_REVIEW,
    });

    assert.deepEqual(valid.errors, {});
    assert.equal(valid.data.publicSummary, "Inspection is scheduled for Friday.");
    assert.equal(valid.data.nextStep, "We will call after the inspection.");
    assert.equal(valid.data.status, ClaimStatus.IN_REVIEW);

    const invalid = validateClientStatusUpdateInput({
      publicSummary: "Fine",
      nextStep: "x".repeat(clientNextStepMaxLength + 1),
      status: "SECRET_INTERNAL_STATUS",
    });

    assert.equal(invalid.errors.nextStep, `Keep the next step under ${clientNextStepMaxLength} characters.`);
    assert.equal(invalid.errors.status, "Choose a valid claim status.");
  });
});
