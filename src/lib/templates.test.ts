import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DocumentCategory, TaskPriority } from "@/generated/prisma/client";
import {
  activityInputFromTemplate,
  documentInputFromTemplate,
  dueDateFromPreset,
  normalizeDueDatePreset,
  taskAssociationFromInput,
  taskDueDateFromInput,
  taskInputFromTemplate,
  taskTemplateActivityNote,
  taskTemplates,
} from "./templates";

describe("office templates", () => {
  it("includes expected task templates for common follow-ups", () => {
    const templateKeys = taskTemplates.map((template) => template.key);

    assert.deepEqual(templateKeys, [
      "follow-up-with-lead",
      "schedule-inspection",
      "request-policy-documents",
      "upload-photos",
      "send-estimate-proposal",
      "follow-up-with-carrier",
      "check-settlement-payment",
      "send-invoice",
      "follow-up-on-receivable",
      "update-client-status-link",
    ]);
  });

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

  it("uses a message template as a communication starter but keeps custom text first", () => {
    const input = activityInputFromTemplate({
      template: {
        name: "Carrier follow-up email",
        subject: "Follow-up on claim status",
        body: "Hello, checking on the claim review.",
        type: "EMAIL",
      },
      subject: "",
      body: "Custom note.",
    });

    assert.equal(input.subject, "Follow-up on claim status");
    assert.equal(input.body, "Custom note.");
  });

  it("falls back to the template name when a message template has no subject", () => {
    const input = activityInputFromTemplate({
      template: {
        name: "Client text follow-up",
        subject: null,
        body: "Hi {{clientFirstName}}, please send the photos.",
        type: "TEXT",
      },
      subject: "",
      body: "",
    });

    assert.equal(input.subject, "Client text follow-up");
    assert.equal(input.body, "Hi {{clientFirstName}}, please send the photos.");
  });

  it("calculates predictable due dates from presets", () => {
    const now = new Date("2026-05-29T09:30:00.000Z");
    const todayDue = dueDateFromPreset("TODAY", now);
    const tomorrowDue = dueDateFromPreset("TOMORROW", now);
    const inThreeDaysDue = dueDateFromPreset("IN_3_DAYS", now);
    const inOneWeekDue = dueDateFromPreset("IN_1_WEEK", now);

    assert.equal(todayDue?.getDate(), 29);
    assert.equal(todayDue?.getHours(), 12);
    assert.equal(tomorrowDue?.getDate(), 30);
    assert.equal(tomorrowDue?.getHours(), 12);
    assert.equal(inThreeDaysDue?.getDate(), 1);
    assert.equal(inThreeDaysDue?.getMonth(), 5);
    assert.equal(inThreeDaysDue?.getHours(), 12);
    assert.equal(inOneWeekDue?.getDate(), 5);
    assert.equal(inOneWeekDue?.getMonth(), 5);
    assert.equal(inOneWeekDue?.getHours(), 12);
  });

  it("resolves due date defaults and custom date input", () => {
    const now = new Date("2026-05-29T09:30:00.000Z");
    const tomorrowDue = taskDueDateFromInput({ duePreset: "TOMORROW", now });
    const customDue = taskDueDateFromInput({ duePreset: "CUSTOM", dueDate: "2026-06-11", now });

    assert.equal(tomorrowDue?.getDate(), 30);
    assert.equal(tomorrowDue?.getHours(), 12);
    assert.equal(customDue?.getDate(), 11);
    assert.equal(customDue?.getMonth(), 5);
    assert.equal(customDue?.getHours(), 12);
    assert.equal(taskDueDateFromInput({ duePreset: "CUSTOM", dueDate: "", now }), undefined);
    assert.equal(normalizeDueDatePreset("unknown"), "TODAY");
  });

  it("keeps task association scoped to a claim or lead", () => {
    assert.deepEqual(taskAssociationFromInput({ claimId: "claim-1" }), {
      claimId: "claim-1",
      leadId: undefined,
      target: "claim",
      error: undefined,
    });

    assert.deepEqual(taskAssociationFromInput({ leadId: "lead-1" }), {
      claimId: undefined,
      leadId: "lead-1",
      target: "lead",
      error: undefined,
    });

    assert.equal(taskAssociationFromInput({ claimId: "claim-1", leadId: "lead-1" }).error, "Choose either a claim or a lead when creating a task.");
  });

  it("creates an activity note when a task comes from a template", () => {
    const activity = taskTemplateActivityNote({
      templateKey: "follow-up-with-carrier",
      taskTitle: "Follow up with carrier",
      dueDate: new Date("2026-06-02T12:00:00.000Z"),
      target: "claim",
    });

    assert.equal(activity?.subject, "Task added from template: Follow up with carrier");
    assert.match(activity?.body ?? "", /follow up with carrier/i);
    assert.match(activity?.body ?? "", /2026-06-02/);
  });
});