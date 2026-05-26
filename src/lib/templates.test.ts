import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DocumentCategory, TaskPriority } from "@/generated/prisma/client";
import { documentInputFromTemplate, taskInputFromTemplate } from "./templates";

describe("office templates", () => {
  it("uses a selected task template when the task name is blank", () => {
    const input = taskInputFromTemplate({ templateKey: "follow-up-with-carrier", title: "", priority: "" });

    assert.equal(input.title, "Follow up with carrier");
    assert.equal(input.priority, TaskPriority.HIGH);
    assert.match(input.notes ?? "", /claim status/i);
  });

  it("keeps custom task text ahead of template defaults", () => {
    const input = taskInputFromTemplate({
      templateKey: "schedule-inspection",
      title: "Meet client at property",
      notes: "Bring ladder.",
      priority: TaskPriority.LOW,
    });

    assert.equal(input.title, "Meet client at property");
    assert.equal(input.notes, "Bring ladder.");
    assert.equal(input.priority, TaskPriority.LOW);
  });

  it("turns a document request template into a client request", () => {
    const input = documentInputFromTemplate({ templateKey: "policy-documents", title: "", category: DocumentCategory.OTHER });

    assert.equal(input.title, "Policy declarations and forms");
    assert.equal(input.category, DocumentCategory.POLICY);
    assert.equal(input.requestedFromClient, true);
    assert.match(input.notes ?? "", /declarations pages/i);
  });

  it("uses manual document fields when no request template is selected", () => {
    const input = documentInputFromTemplate({
      title: "Kitchen cabinet photos",
      category: DocumentCategory.PHOTOS,
      notes: "Received by text.",
      requestedFromClient: false,
      hasFile: true,
    });

    assert.equal(input.title, "Kitchen cabinet photos");
    assert.equal(input.category, DocumentCategory.PHOTOS);
    assert.equal(input.notes, "Received by text.");
    assert.equal(input.requestedFromClient, false);
  });
});