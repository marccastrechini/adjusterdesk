import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import SystemFeedbackPage from "@/app/(app)/system/feedback/page";
import { appSession } from "@/lib/app-context";
import { brandName } from "@/lib/brand";
import { renderFeedbackOwnerEmail, sendFeedbackOwnerEmail, type FeedbackOwnerEmailInput } from "@/lib/email";
import { feedbackOwnerMail, notifyOwnerOfNewFeedback } from "@/lib/feedback-review";
import { createFeedbackWithState } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { systemFeedbackPageSize } from "@/lib/queries";

const envKeys = ["APP_BASE_URL", "EMAIL_PROVIDER", "RESEND_API_KEY", "SYSTEM_ADMIN_EMAIL", "SYSTEM_EMAIL_FROM"] as const;

function snapshotEnv() {
  const previous = new Map(envKeys.map((key) => [key, process.env[key]]));
  return () => {
    for (const key of envKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function patch<T extends object, K extends keyof T>(target: T, key: K, value: unknown) {
  const original = target[key];
  target[key] = value as T[K];
  return () => {
    target[key] = original;
  };
}

function redirectUrlFromError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return null;
  }

  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT;")) {
    return null;
  }

  return digest.split(";").slice(2, -2).join(";");
}

function navigationError(error: unknown) {
  const url = redirectUrlFromError(error);
  if (url) return url;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("static generation store missing in revalidatePath")) {
    return "revalidated";
  }
  return null;
}

const officeUser = {
  id: "user_1",
  firmId: "firm_1",
  name: "Pat Adjuster",
  email: "pat@harbor.example",
  role: "ADJUSTER",
  isSystemAdmin: false,
  isOutreachOperator: false,
  active: true,
};

function feedbackForm(message = "The document list is hard to scan during a call.") {
  const formData = new FormData();
  formData.set("page", "Claim documents");
  formData.set("rating", "4");
  formData.set("message", message);
  return formData;
}

function installOfficeSession() {
  const restoreSession = patch(appSession, "getCurrentSessionUser", async () => officeUser);
  const restoreFirm = patch(prisma.firm, "findUnique", async () => ({
    id: "firm_1",
    name: "Harbor Public Adjusting",
    users: [officeUser],
  }));
  return () => {
    restoreSession();
    restoreFirm();
  };
}

describe("feedback owner review", { concurrency: 1 }, () => {
  it("renders an owner email with the office, submitter, page, rating, message, and review link", () => {
    const rendered = renderFeedbackOwnerEmail({
      firmName: "Harbor Public Adjusting",
      submitterName: "Pat Adjuster",
      submitterEmail: "pat@harbor.example",
      page: "Claim documents",
      rating: 4,
      message: "The document list is hard to scan.\n<script>alert(1)</script>",
      reviewUrl: "https://sandbox.example.test/system/feedback#fb_123",
    });

    assert.match(rendered.subject, new RegExp(`^${brandName} feedback from Harbor Public Adjusting$`));
    for (const body of [rendered.html, rendered.text]) {
      assert.match(body, /Harbor Public Adjusting/);
      assert.match(body, /Pat Adjuster/);
      assert.match(body, /pat@harbor.example/);
      assert.match(body, /Claim documents/);
      assert.match(body, /4\/5/);
      assert.match(body, /hard to scan/);
      assert.match(body, /https:\/\/sandbox\.example\.test\/system\/feedback#fb_123/);
    }
    assert.equal(rendered.html.includes("<script>"), false);
    assert.match(rendered.html, /&lt;script&gt;/);
  });

  it("labels missing page and rating without dropping the message", () => {
    const rendered = renderFeedbackOwnerEmail({
      firmName: "Harbor Public Adjusting",
      submitterName: "Pat Adjuster",
      submitterEmail: "pat@harbor.example",
      page: "  ",
      rating: null,
      message: "Need a clearer next step after intake.",
      reviewUrl: "https://sandbox.example.test/system/feedback#fb_9",
    });

    assert.match(rendered.text, /General feedback/);
    assert.match(rendered.text, /No rating/);
    assert.match(rendered.text, /clearer next step/);
  });

  it("sends one message to SYSTEM_ADMIN_EMAIL and reports a missing mailbox without throwing", async () => {
    const restoreEnv = snapshotEnv();
    const originalFetch = globalThis.fetch;
    try {
      delete process.env.SYSTEM_ADMIN_EMAIL;
      const missing = await sendFeedbackOwnerEmail({
        firmName: "Harbor Public Adjusting",
        submitterName: "Pat Adjuster",
        submitterEmail: "pat@harbor.example",
        message: "Need a clearer next step after intake.",
        reviewUrl: "https://sandbox.example.test/system/feedback#fb_9",
      });
      assert.equal(missing.ok, false);
      assert.match(missing.error ?? "", /SYSTEM_ADMIN_EMAIL/);

      process.env.SYSTEM_ADMIN_EMAIL = "admin@paclaimboard.com";
      process.env.EMAIL_PROVIDER = "resend";
      process.env.RESEND_API_KEY = "re_test_feedback";
      process.env.SYSTEM_EMAIL_FROM = `${brandName} <hello@paclaimboard.com>`;
      let requestUrl = "";
      let requestBody = "";
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        requestUrl = String(input);
        requestBody = String(init?.body ?? "");
        return new Response(JSON.stringify({ id: "msg_feedback" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch;

      const sent = await sendFeedbackOwnerEmail({
        firmName: "Harbor Public Adjusting",
        submitterName: "Pat Adjuster",
        submitterEmail: "pat@harbor.example",
        page: "Claim documents",
        rating: 4,
        message: "The document list is hard to scan during a call.",
        reviewUrl: "https://sandbox.example.test/system/feedback#fb_123",
      });

      assert.equal(sent.ok, true);
      assert.equal(requestUrl, "https://api.resend.com/emails");
      const payload = JSON.parse(requestBody) as { to?: string[]; subject?: string; text?: string };
      assert.deepEqual(payload.to, ["admin@paclaimboard.com"]);
      assert.match(payload.subject ?? "", /Harbor Public Adjusting/);
      assert.match(payload.text ?? "", /pat@harbor.example/);
      assert.match(payload.text ?? "", /\/system\/feedback#fb_123/);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnv();
    }
  });

  it("createFeedback attempts the owner notification and still finishes when mail fails", async () => {
    assert.equal(feedbackOwnerMail.send, sendFeedbackOwnerEmail);

    const restoreEnv = snapshotEnv();
    const restoreSession = installOfficeSession();
    const calls: string[] = [];
    const sent: FeedbackOwnerEmailInput[] = [];
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };
    process.env.APP_BASE_URL = "https://sandbox.example.test";

    const restoreCreate = patch(prisma.feedbackEntry, "create", async (args: { data: { firmId: string; message: string } }) => {
      calls.push("create");
      assert.equal(args.data.firmId, "firm_1");
      assert.match(args.data.message, /hard to scan/);
      return { id: "fb_123" };
    });
    const restoreSend = patch(feedbackOwnerMail, "send", async (input: FeedbackOwnerEmailInput) => {
      calls.push("send");
      sent.push(input);
      return { ok: false, error: "mailbox unavailable" };
    });

    try {
      await createFeedbackWithState({}, feedbackForm());
      assert.fail("Expected feedback create to continue into redirect.");
    } catch (error) {
      assert.ok(navigationError(error), error instanceof Error ? error.message : String(error));
    } finally {
      console.error = originalError;
      restoreSend();
      restoreCreate();
      restoreSession();
      restoreEnv();
    }

    assert.deepEqual(calls, ["create", "send"]);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.firmName, "Harbor Public Adjusting");
    assert.equal(sent[0]?.submitterName, "Pat Adjuster");
    assert.equal(sent[0]?.submitterEmail, "pat@harbor.example");
    assert.equal(sent[0]?.page, "Claim documents");
    assert.equal(sent[0]?.rating, 4);
    assert.match(sent[0]?.reviewUrl ?? "", /^https:\/\/sandbox\.example\.test\/system\/feedback#fb_123$/);
    assert.ok(errors.some((line) => line.includes("mailbox unavailable")));
  });

  it("a thrown mail error does not block saving feedback", async () => {
    const restoreSession = installOfficeSession();
    let created = false;
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };
    const restoreCreate = patch(prisma.feedbackEntry, "create", async () => {
      created = true;
      return { id: "fb_throw" };
    });
    const restoreSend = patch(feedbackOwnerMail, "send", async () => {
      throw new Error("smtp down");
    });

    try {
      await createFeedbackWithState({}, feedbackForm("Intake still needs a clearer next step."));
      assert.fail("Expected feedback create to continue into redirect.");
    } catch (error) {
      assert.ok(navigationError(error), error instanceof Error ? error.message : String(error));
    } finally {
      console.error = originalError;
      restoreSend();
      restoreCreate();
      restoreSession();
    }

    assert.equal(created, true);
    assert.ok(errors.some((line) => line.includes("smtp down")));
  });

  it("does not notify when the feedback note is rejected", async () => {
    const restoreSession = installOfficeSession();
    let created = 0;
    let sent = 0;
    const restoreCreate = patch(prisma.feedbackEntry, "create", async () => {
      created += 1;
      return { id: "fb_rejected" };
    });
    const restoreSend = patch(feedbackOwnerMail, "send", async () => {
      sent += 1;
      return { ok: true };
    });

    try {
      const result = await createFeedbackWithState({}, feedbackForm("too short"));
      assert.match(result.message ?? "", /short note/);
      assert.equal(created, 0);
      assert.equal(sent, 0);
    } finally {
      restoreSend();
      restoreCreate();
      restoreSession();
    }
  });

  it("logs a notification failure from notifyOwnerOfNewFeedback without rejecting the save", async () => {
    const restoreSend = patch(feedbackOwnerMail, "send", async () => ({ ok: false, error: "provider down" }));
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };

    try {
      const result = await notifyOwnerOfNewFeedback({
        firmName: "Harbor Public Adjusting",
        submitterName: "Pat Adjuster",
        submitterEmail: "pat@harbor.example",
        message: "Need a clearer next step after intake.",
        reviewUrl: "https://sandbox.example.test/system/feedback#fb_9",
      });
      assert.equal(result.ok, false);
      assert.ok(errors.some((line) => line.includes("[feedback]") && line.includes("provider down")));
    } finally {
      console.error = originalError;
      restoreSend();
    }
  });

  it("refuses /system/feedback to someone who is not a system admin", async () => {
    const cases = [
      { user: null, destination: "/today" },
      { user: officeUser, destination: "/today" },
      {
        user: { ...officeUser, isOutreachOperator: true },
        destination: "/system/outreach",
      },
    ] as const;

    for (const item of cases) {
      let reads = 0;
      const restoreSession = patch(appSession, "getCurrentSessionUser", async () => item.user);
      const restoreCount = patch(prisma.feedbackEntry, "count", async () => {
        reads += 1;
        return 0;
      });
      const restoreFind = patch(prisma.feedbackEntry, "findMany", async () => {
        reads += 1;
        return [];
      });

      try {
        await SystemFeedbackPage({ searchParams: Promise.resolve({}) });
        assert.fail(`Expected ${item.destination} for a blocked visitor.`);
      } catch (error) {
        assert.equal(redirectUrlFromError(error), item.destination);
      } finally {
        restoreFind();
        restoreCount();
        restoreSession();
      }

      assert.equal(reads, 0);
    }
  });

  it("lists feedback across workspaces, newest first, for a system admin", async () => {
    const restoreSession = patch(appSession, "getCurrentSessionUser", async () => ({
      ...officeUser,
      isSystemAdmin: true,
    }));
    let listArgs: { where?: unknown; orderBy?: unknown; skip?: number; take?: number } | undefined;
    const restoreCount = patch(prisma.feedbackEntry, "count", async () => systemFeedbackPageSize + 1);
    const restoreFind = patch(prisma.feedbackEntry, "findMany", async (args: { where?: unknown; orderBy?: unknown; skip?: number; take?: number }) => {
      listArgs = args;
      return [
        {
          id: "fb_123",
          page: "Claim documents",
          rating: 4,
          message: "The document list is hard to scan during a call.",
          createdAt: new Date("2026-10-29T15:04:00.000Z"),
          firm: { id: "firm_1", name: "Harbor Public Adjusting" },
          user: { name: "Pat Adjuster", email: "pat@harbor.example" },
        },
      ];
    });

    try {
      const element = await SystemFeedbackPage({ searchParams: Promise.resolve({ page: "2" }) });
      const html = renderToStaticMarkup(element);

      assert.equal(listArgs?.where, undefined);
      assert.deepEqual(listArgs?.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
      assert.equal(listArgs?.skip, systemFeedbackPageSize);
      assert.equal(listArgs?.take, systemFeedbackPageSize);
      assert.match(html, /Harbor Public Adjusting/);
      assert.match(html, /Pat Adjuster/);
      assert.match(html, /pat@harbor\.example/);
      assert.match(html, /Claim documents/);
      assert.match(html, /4\/5/);
      assert.match(html, /hard to scan during a call/);
      assert.match(html, /id="fb_123"/);
      assert.match(html, /\/system\/workspaces\/firm_1/);
      assert.match(html, /Previous/);
      assert.match(html, /href="\/system\/feedback"/);
      assert.equal(html.includes(">Next<"), false);
    } finally {
      restoreFind();
      restoreCount();
      restoreSession();
    }
  });
});
