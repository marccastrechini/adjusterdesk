import assert from "node:assert/strict";
import { test } from "node:test";
import { OutreachProspectStatus, OutreachTaskType } from "@/generated/prisma/client";
import { applyOutreachEmailTaskRules, applyOutreachStatusTaskRules } from "@/lib/outreach-tasks";

function mockTaskClient() {
  const creates: Array<unknown> = [];
  const updates: Array<unknown> = [];
  const openTaskByType = new Map<OutreachTaskType, boolean>();

  const prismaClient = {
    outreachTask: {
      findFirst: async (args: unknown) => {
        const payload = args as { where: { type: OutreachTaskType } };
        return openTaskByType.get(payload.where.type) ? { id: "open_task" } : null;
      },
      findMany: async () => [],
      create: async (args: unknown) => {
        creates.push(args);
        return {};
      },
      updateMany: async (args: unknown) => {
        updates.push(args);
        return { count: 1 };
      },
    },
  } as never;

  return {
    prismaClient,
    creates,
    updates,
    openTaskByType,
  };
}

test("READY_FOR_OUTREACH creates SEND_EMAIL_1 task when missing", async () => {
  const mock = mockTaskClient();

  await applyOutreachStatusTaskRules({
    outreachProspectId: "prospect_1",
    nextStatus: OutreachProspectStatus.READY_FOR_OUTREACH,
    assignedToUserId: "user_1",
    now: new Date("2026-06-17T12:00:00.000Z"),
    prismaClient: mock.prismaClient,
  });

  assert.equal(mock.creates.length, 1);
  const createPayload = mock.creates[0] as { data: { type: OutreachTaskType } };
  assert.equal(createPayload.data.type, OutreachTaskType.SEND_EMAIL_1);
});

test("REPLIED_INTERESTED cancels follow-up/recycle and creates fit check", async () => {
  const mock = mockTaskClient();

  await applyOutreachStatusTaskRules({
    outreachProspectId: "prospect_2",
    nextStatus: OutreachProspectStatus.REPLIED_INTERESTED,
    assignedToUserId: "user_2",
    now: new Date("2026-06-17T12:00:00.000Z"),
    prismaClient: mock.prismaClient,
  });

  assert.equal(mock.updates.length, 1);
  const cancelPayload = mock.updates[0] as { where: { type: { in: OutreachTaskType[] } } };
  assert.deepEqual(cancelPayload.where.type.in, [OutreachTaskType.SEND_FOLLOW_UP, OutreachTaskType.RECYCLE_REVIEW]);

  assert.equal(mock.creates.length, 1);
  const fitCheckPayload = mock.creates[0] as { data: { type: OutreachTaskType } };
  assert.equal(fitCheckPayload.data.type, OutreachTaskType.SCHEDULE_FIT_CHECK);
});

test("TRIAL_CREATED cancels all open outreach tasks", async () => {
  const mock = mockTaskClient();

  await applyOutreachStatusTaskRules({
    outreachProspectId: "prospect_3",
    nextStatus: OutreachProspectStatus.TRIAL_CREATED,
    assignedToUserId: "user_3",
    now: new Date("2026-06-17T12:00:00.000Z"),
    prismaClient: mock.prismaClient,
  });

  assert.equal(mock.updates.length, 1);
  const payload = mock.updates[0] as { where: { outreachProspectId: string; status: string } };
  assert.equal(payload.where.outreachProspectId, "prospect_3");
  assert.equal(payload.where.status, "OPEN");
});

test("First email rules complete SEND_EMAIL_1 and create SEND_FOLLOW_UP", async () => {
  const mock = mockTaskClient();

  await applyOutreachEmailTaskRules({
    outreachProspectId: "prospect_4",
    templateKey: "outreach_first_email",
    now: new Date("2026-06-19T12:00:00.000Z"),
    assignedToUserId: "user_4",
    prismaClient: mock.prismaClient,
  });

  assert.equal(mock.updates.length, 1);
  const donePayload = mock.updates[0] as { where: { type: OutreachTaskType } };
  assert.equal(donePayload.where.type, OutreachTaskType.SEND_EMAIL_1);

  assert.equal(mock.creates.length, 1);
  const createPayload = mock.creates[0] as { data: { type: OutreachTaskType; dueDate: Date } };
  assert.equal(createPayload.data.type, OutreachTaskType.SEND_FOLLOW_UP);
  assert.equal(createPayload.data.dueDate.toISOString(), "2026-06-25T12:00:00.000Z");
});

test("Follow-up email rules complete SEND_FOLLOW_UP and create RECYCLE_REVIEW", async () => {
  const mock = mockTaskClient();

  await applyOutreachEmailTaskRules({
    outreachProspectId: "prospect_5",
    templateKey: "outreach_follow_up",
    now: new Date("2026-06-19T12:00:00.000Z"),
    assignedToUserId: "user_5",
    prismaClient: mock.prismaClient,
  });

  assert.equal(mock.updates.length, 1);
  const donePayload = mock.updates[0] as { where: { type: OutreachTaskType } };
  assert.equal(donePayload.where.type, OutreachTaskType.SEND_FOLLOW_UP);

  assert.equal(mock.creates.length, 1);
  const createPayload = mock.creates[0] as { data: { type: OutreachTaskType; dueDate: Date } };
  assert.equal(createPayload.data.type, OutreachTaskType.RECYCLE_REVIEW);
  assert.equal(createPayload.data.dueDate.toISOString(), "2026-06-26T12:00:00.000Z");
});
