import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActivityType } from "@/generated/prisma/client";
import {
  buildClaimActivityTimeline,
  filterTimelineItems,
  normalizeTimelineFilter,
  timelineCategoryForActivity,
  validateManualActivityInput,
} from "./activity-log";

describe("activity timeline helpers", () => {
  it("categorizes activity subjects into timeline sections", () => {
    assert.equal(timelineCategoryForActivity({ type: ActivityType.NOTE, subject: "Document request created" }), "DOCUMENTS");
    assert.equal(timelineCategoryForActivity({ type: ActivityType.NOTE, subject: "Task marked complete" }), "TASKS");
    assert.equal(timelineCategoryForActivity({ type: ActivityType.NOTE, subject: "Invoice saved" }), "MONEY");
    assert.equal(timelineCategoryForActivity({ type: ActivityType.NOTE, subject: "Client status link regenerated" }), "CLIENT_UPDATES");
    assert.equal(timelineCategoryForActivity({ type: ActivityType.CALL, subject: "Called desk adjuster" }), "NOTES");
  });

  it("sorts timeline entries newest first and filters by category", () => {
    const timeline = buildClaimActivityTimeline([
      { id: "a", type: ActivityType.NOTE, subject: "Document request created", occurredAt: "2026-05-01T10:00:00.000Z" },
      { id: "b", type: ActivityType.NOTE, subject: "Invoice saved", occurredAt: "2026-05-02T10:00:00.000Z" },
      { id: "c", type: ActivityType.CALL, subject: "Called client", occurredAt: "2026-05-03T10:00:00.000Z" },
    ]);

    assert.deepEqual(timeline.map((item) => item.id), ["c", "b", "a"]);
    assert.deepEqual(filterTimelineItems(timeline, "MONEY").map((item) => item.id), ["b"]);
    assert.equal(normalizeTimelineFilter("CLIENT_UPDATES"), "CLIENT_UPDATES");
    assert.equal(normalizeTimelineFilter("unknown"), "ALL");
  });

  it("validates manual activity input and allows body-only notes", () => {
    assert.equal(validateManualActivityInput({ subject: "Called carrier", body: "Left voicemail" }), undefined);
    assert.equal(validateManualActivityInput({ subject: "", body: "" }), undefined);

    const bodySummary = validateManualActivityInput({ subject: "", body: "Desk adjuster requested additional photos and invoices." });
    assert.equal(bodySummary, "Desk adjuster requested additional photos and invoices.");
  });
});
