import assert from "node:assert/strict";
import { test } from "node:test";
import { OutreachActivityStatus, OutreachProspectStatus } from "@/generated/prisma/client";
import { renderOutreachEmailTemplate, resolveOutreachSenderPolicy, sendOutreachTemplateEmail } from "@/lib/outreach-email";

function withEnv<T>(values: Record<string, string | undefined>, callback: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("outreach templates render key variables", () => {
  const rendered = renderOutreachEmailTemplate({
    templateKey: "outreach_first_email",
    prospectFirmName: "Harbor Public Adjusting",
    prospectContactName: "Dana",
    operatorName: "Jenn",
    operatorEmail: "jenn@adjusterdesk.xyz",
  });

  assert.ok(rendered);
  assert.ok(rendered.subject.includes("Harbor Public Adjusting"));
  assert.ok(rendered.body.includes("Hi Dana,"));
  assert.ok(rendered.body.includes("https://adjusterdesk.xyz/free-public-adjuster-claim-tracker"));
  assert.ok(rendered.body.includes("https://adjusterdesk.xyz/signup"));
  assert.ok(rendered.body.includes("jenn@adjusterdesk.xyz"));
});

test("sender policy uses operator reply-to with safe fallback from when direct from is disabled", () => {
  withEnv(
    {
      EMAIL_PROVIDER: "resend",
      OUTREACH_ALLOW_OPERATOR_FROM: "false",
      SYSTEM_EMAIL_FROM: "AdjusterDesk <hello@adjusterdesk.xyz>",
      SYSTEM_EMAIL_REPLY_TO: "hello@adjusterdesk.xyz",
    },
    () => {
      const sender = resolveOutreachSenderPolicy({ userName: "Jenn", userEmail: "jenn@adjusterdesk.xyz" });
      assert.equal(sender.fromEmail, "hello@adjusterdesk.xyz");
      assert.equal(sender.replyToEmail, "jenn@adjusterdesk.xyz");
      assert.equal(sender.usingOperatorFrom, false);
      assert.equal(sender.usingOperatorReplyTo, true);
    },
  );
});

test("sender policy never uses admin mailbox for outreach", () => {
  withEnv(
    {
      EMAIL_PROVIDER: "resend",
      OUTREACH_ALLOW_OPERATOR_FROM: "true",
      SYSTEM_EMAIL_FROM: "AdjusterDesk <admin@adjusterdesk.xyz>",
      SYSTEM_EMAIL_REPLY_TO: "admin@adjusterdesk.xyz",
    },
    () => {
      const sender = resolveOutreachSenderPolicy({ userName: "Admin", userEmail: "admin@adjusterdesk.xyz" });
      assert.notEqual(sender.fromEmail, "admin@adjusterdesk.xyz");
      assert.notEqual(sender.replyToEmail, "admin@adjusterdesk.xyz");
      assert.equal(sender.fromEmail, "hello@adjusterdesk.xyz");
      assert.equal(sender.replyToEmail, "hello@adjusterdesk.xyz");
    },
  );
});

test("sendOutreachTemplateEmail logs SENT and updates status/date/follow-up for first outreach", async () => {
  const updates: Array<unknown> = [];
  const activities: Array<unknown> = [];

  const prismaClient = {
    outreachProspect: {
      findUnique: async () => ({
        id: "prospect_1",
        firmName: "Harbor Public Adjusting",
        contactName: "Dana",
        email: "dana@example.com",
        status: OutreachProspectStatus.READY_FOR_OUTREACH,
        dateContacted: null,
        followUpDate: null,
      }),
      update: async (args: unknown) => {
        updates.push(args);
        return {};
      },
    },
    outreachActivity: {
      create: async (args: unknown) => {
        activities.push(args);
        return {};
      },
    },
    outreachTask: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  } as never;

  const now = new Date("2026-06-19T12:00:00.000Z");
  const result = await sendOutreachTemplateEmail(
    {
      outreachProspectId: "prospect_1",
      templateKey: "outreach_first_email",
      actor: {
        id: "user_1",
        name: "Jenn",
        email: "jenn@adjusterdesk.xyz",
      },
    },
    {
      now,
      prismaClient,
      sendEmail: async () => ({ ok: true, messageId: "msg_123" }),
    },
  );

  assert.equal(result.ok, true);
  assert.equal(updates.length, 1);
  assert.equal(activities.length, 1);

  const updatePayload = updates[0] as { data: { status: OutreachProspectStatus; dateContacted: Date; followUpDate: Date } };
  assert.equal(updatePayload.data.status, OutreachProspectStatus.CONTACTED);
  assert.equal(updatePayload.data.dateContacted.toISOString(), now.toISOString());
  assert.equal(updatePayload.data.followUpDate.toISOString(), "2026-06-25T12:00:00.000Z");

  const activityPayload = activities[0] as { data: { status: OutreachActivityStatus; providerMessageId?: string } };
  assert.equal(activityPayload.data.status, OutreachActivityStatus.SENT);
  assert.equal(activityPayload.data.providerMessageId, "msg_123");
});

test("sendOutreachTemplateEmail logs FAILED and does not update status on provider failure", async () => {
  const updates: Array<unknown> = [];
  const activities: Array<unknown> = [];

  const prismaClient = {
    outreachProspect: {
      findUnique: async () => ({
        id: "prospect_2",
        firmName: "Harbor Public Adjusting",
        contactName: "Dana",
        email: "dana@example.com",
        status: OutreachProspectStatus.READY_FOR_OUTREACH,
        dateContacted: null,
        followUpDate: null,
      }),
      update: async (args: unknown) => {
        updates.push(args);
        return {};
      },
    },
    outreachActivity: {
      create: async (args: unknown) => {
        activities.push(args);
        return {};
      },
    },
    outreachTask: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  } as never;

  const result = await sendOutreachTemplateEmail(
    {
      outreachProspectId: "prospect_2",
      templateKey: "outreach_first_email",
      actor: {
        id: "user_1",
        name: "Jenn",
        email: "jenn@adjusterdesk.xyz",
      },
    },
    {
      prismaClient,
      sendEmail: async () => ({ ok: false, error: "Resend send failed: simulated" }),
    },
  );

  assert.equal(result.ok, false);
  assert.equal(updates.length, 0);
  assert.equal(activities.length, 1);

  const activityPayload = activities[0] as { data: { status: OutreachActivityStatus; errorMessage?: string } };
  assert.equal(activityPayload.data.status, OutreachActivityStatus.FAILED);
  assert.ok(activityPayload.data.errorMessage?.includes("simulated"));
});
