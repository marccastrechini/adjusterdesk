import { notFound } from "next/navigation";
import { OutreachProspectStatus, OutreachTaskType } from "@/generated/prisma/client";
import {
  cancelSystemOutreachTask,
  completeSystemOutreachTask,
  markSystemOutreachCallAttempt,
  sendSystemOutreachEmail,
  skipSystemOutreachTask,
  updateSystemOutreachProspect,
} from "@/lib/actions";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { freeClaimTrackerUrl, outreachStatusGuide, outreachStatusLabel, outreachStatusOptions, trialSignupUrl } from "@/lib/outreach";
import {
  isOutreachEmailTemplateKey,
  outreachEmailTemplateOptions,
  renderOutreachEmailTemplate,
  resolveOutreachSenderPolicy,
} from "@/lib/outreach-email";
import { getSystemOutreachActivitiesByProspectId, getSystemOutreachProspectById, getSystemOutreachTasksByProspectId } from "@/lib/queries";
import { ButtonLink, Card, Field, Notice, PageHeader, SubmitButton, inputClassName, selectClassName, textareaClassName } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateInputValue(date?: Date | string | null) {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const yyyy = value.getUTCFullYear();
  const mm = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${value.getUTCDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateText(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
}

function dateTimeText(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")} ${`${date.getUTCHours()}`.padStart(2, "0")}:${`${date.getUTCMinutes()}`.padStart(2, "0")} UTC`;
}

function formatDraftText(contactName: string | null, body: string) {
  const greeting = contactName?.trim() ? `Hi ${contactName.trim()},` : "Hi there,";
  return `${greeting}\n\n${body}\n\nThanks,\nAdjusterDesk`;
}

function taskTypeLabel(type: OutreachTaskType) {
  const map: Record<OutreachTaskType, string> = {
    RESEARCH: "Research",
    CALL_ATTEMPT_1: "Call attempt 1",
    SEND_EMAIL_1: "Send Email 1",
    CALL_ATTEMPT_2: "Call attempt 2",
    SEND_FOLLOW_UP: "Send follow-up",
    REVIEW_REPLY: "Review reply",
    SCHEDULE_FIT_CHECK: "Schedule fit check",
    RECYCLE_REVIEW: "Recycle review",
    MANUAL: "Manual task",
  };
  return map[type];
}

function suggestedNextAction(status: string, nextTaskType?: OutreachTaskType | null): string {
  if (nextTaskType) {
    const taskMap: Record<OutreachTaskType, string> = {
      RESEARCH: "Review and verify this prospect. Update contact details and move to Ready for outreach when qualified.",
      CALL_ATTEMPT_1: "Attempt a call to this prospect.",
      SEND_EMAIL_1: "Send Email 1 with the free claim tracker link.",
      CALL_ATTEMPT_2: "Attempt a second call.",
      SEND_FOLLOW_UP: "Send the follow-up email. Check notes for reply context first.",
      REVIEW_REPLY: "Review the latest reply and determine next step. Mark interested, not now, or fit check as appropriate.",
      SCHEDULE_FIT_CHECK: "Schedule a short call to confirm fit for the first 10 claims.",
      RECYCLE_REVIEW: "Review this prospect. Decide whether to re-engage or mark bad fit.",
      MANUAL: "Complete the manual task noted above.",
    };
    return taskMap[nextTaskType];
  }
  const statusMap: Record<string, string> = {
    NOT_CONTACTED: "Review this prospect and move to Ready for outreach if they look like a good small-office fit.",
    READY_FOR_OUTREACH: "Send Email 1 with the free claim tracker link.",
    CONTACTED: "Wait for a reply. If no reply within a week, move to Follow-up due.",
    FOLLOW_UP_DUE: "Send the follow-up email. Set a follow-up date.",
    REPLIED_INTERESTED: "Reach out to schedule a short fit check call.",
    REPLIED_NOT_NOW: "Note the timing. Set a future follow-up date if appropriate.",
    FIT_CHECK_SCHEDULED: "Confirm the fit check details. Prepare a brief call agenda.",
    TRIAL_CREATED: "Check in after a few days to see if they have questions.",
    BAD_FIT: "No further action needed unless circumstances change.",
  };
  return statusMap[status] ?? "Review this prospect and update the status.";
}

function startOfUtcDayDetail(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function endOfUtcDayDetail(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

export default async function SystemOutreachProspectPage({ params, searchParams }: PageProps) {
  const sessionUser = await requireSystemOutreachContext();
  const { id } = await params;
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);

  const prospect = await getSystemOutreachProspectById(id);
  if (!prospect) {
    notFound();
  }

  const [activities, tasks] = await Promise.all([
    getSystemOutreachActivitiesByProspectId(id),
    getSystemOutreachTasksByProspectId(id),
  ]);

  const selectedTemplateCandidate = firstValue(query.templateKey) || "outreach_first_email";
  const selectedTemplateKey = isOutreachEmailTemplateKey(selectedTemplateCandidate) ? selectedTemplateCandidate : "outreach_first_email";
  const senderPolicy = resolveOutreachSenderPolicy({
    userName: sessionUser.name,
    userEmail: sessionUser.email,
  });
  const renderedTemplate = renderOutreachEmailTemplate({
    templateKey: selectedTemplateKey,
    prospectFirmName: prospect.firmName,
    prospectContactName: prospect.contactName,
    operatorName: sessionUser.name,
    operatorEmail: sessionUser.email,
  });

  const hasRecipientEmail = Boolean(prospect.email?.trim());
  const operatorHasAdjusterDeskEmail = sessionUser.email.toLowerCase().endsWith("@adjusterdesk.xyz");

  const today = dateInputValue(new Date());
  const email1Draft = formatDraftText(
    prospect.contactName,
    [
      `I work with small public adjusting offices and wanted to share a free claim tracker that may be useful for ${prospect.firmName}.`,
      "",
      `Free claim tracker: ${freeClaimTrackerUrl}`,
      "",
      "I am also getting feedback on a simple workspace for managing the first 10 claims without scattered folders or missed follow-ups.",
      "If you are open to it, I would value a quick reply with what your office would want most.",
    ].join("\n"),
  );
  const followUpDraft = formatDraftText(
    prospect.contactName,
    [
      "Quick follow-up in case my last note got buried.",
      "",
      `Here is the free claim tracker again: ${freeClaimTrackerUrl}`,
      "",
      "If helpful, I can also share a simple workspace for the first 10 claims:",
      `${trialSignupUrl}`,
      "",
      "No pressure at all. If now is not a good time, I can follow up later.",
    ].join("\n"),
  );

  return (
    <>
      <PageHeader
        title={prospect.firmName}
        description="Update outreach status, follow-up, contact activity, and notes."
        actions={
          <>
            <ButtonLink href="/system/outreach/playbook" variant="secondary">Outreach playbook</ButtonLink>
            <ButtonLink href="/system/outreach" variant="secondary">Back to outreach queue</ButtonLink>
          </>
        }
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {error === "update-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Prospect was not updated</p>
          <p className="mt-1 leading-6">Check the entered values and try again.</p>
        </Card>
      ) : null}
      {error === "send-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Email was not sent</p>
          <p className="mt-1 leading-6">Select an outreach template and try again.</p>
        </Card>
      ) : null}
      {error === "send-template" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Email was not sent</p>
          <p className="mt-1 leading-6">Only approved outreach templates can be sent from this page.</p>
        </Card>
      ) : null}
      {error === "send-no-email" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Email was not sent</p>
          <p className="mt-1 leading-6">No public email on this prospect.</p>
        </Card>
      ) : null}
      {error === "send-recipient" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Email was not sent</p>
          <p className="mt-1 leading-6">Prospect email is invalid. Update it and try again.</p>
        </Card>
      ) : null}
      {error === "send-provider" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Email provider send failed</p>
          <p className="mt-1 leading-6">The send attempt was logged. Status was not marked as sent.</p>
        </Card>
      ) : null}
      {error === "task-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Task update not completed</p>
          <p className="mt-1 leading-6">Check task input and try again.</p>
        </Card>
      ) : null}

      {(() => {
        const now = new Date();
        const todayStart = startOfUtcDayDetail(now);
        const todayEnd = endOfUtcDayDetail(now);
        const nextOpenTask = tasks.find((t) => t.status === "OPEN");
        const due = nextOpenTask?.dueDate ?? null;
        const isOverdue = Boolean(due && due < todayStart);
        const isDueToday = Boolean(due && due >= todayStart && due <= todayEnd);
        const lastActivity = activities[0];
        const suggestion = suggestedNextAction(prospect.status, nextOpenTask?.type);
        const dueBadge = isOverdue
          ? <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">Overdue</span>
          : isDueToday
            ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Due today</span>
            : null;
        return (
          <Card className={`text-sm ${isOverdue ? "border-rose-200 bg-rose-50" : isDueToday ? "border-amber-200 bg-amber-50" : ""}`}>
            <p className="text-sm font-semibold text-slate-900">Next action summary</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Status</p>
                <p className="mt-1 font-medium text-slate-800">{outreachStatusLabel(prospect.status)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Next open task</p>
                <p className="mt-1 font-medium text-slate-800">
                  {nextOpenTask ? taskTypeLabel(nextOpenTask.type) : <span className="text-slate-500">No open tasks</span>}
                </p>
                {nextOpenTask?.title && nextOpenTask.title !== taskTypeLabel(nextOpenTask.type) ? (
                  <p className="text-xs text-slate-600">{nextOpenTask.title}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Task due</p>
                <p className="mt-1 font-medium text-slate-800">
                  {due ? (
                    <>{dateText(due)}{dueBadge}</>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Last activity</p>
                <p className="mt-1 font-medium text-slate-800">
                  {lastActivity ? dateText(lastActivity.createdAt) : <span className="text-slate-500">{dateText(prospect.updatedAt)}</span>}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Suggested action</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{suggestion}</p>
            </div>
          </Card>
        );
      })()}

      <Card className="text-sm text-slate-700">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Created</p>
            <p className="mt-1">{dateText(prospect.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Last updated</p>
            <p className="mt-1">{dateText(prospect.updatedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Date contacted</p>
            <p className="mt-1">{dateText(prospect.dateContacted)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Follow-up date</p>
            <p className="mt-1">{dateText(prospect.followUpDate)}</p>
          </div>
        </div>
      </Card>

      <Card className="text-sm text-slate-700">
        <p className="text-sm font-semibold text-slate-900">Status helper</p>
        <p className="mt-1 text-xs text-slate-600">Use one status at a time to keep the queue consistent for daily outreach.</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {outreachStatusGuide.map((item) => (
            <li key={item.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-700">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="text-sm text-slate-700">
        <p className="text-sm font-semibold text-slate-900">Quick actions</p>
        <p className="mt-1 text-xs text-slate-600">Fast status updates for common outreach steps. These actions only update fields shown in each button action.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={updateSystemOutreachProspect}>
            <input type="hidden" name="outreachId" value={prospect.id} />
            <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />
            <input type="hidden" name="status" value={OutreachProspectStatus.READY_FOR_OUTREACH} />
            <SubmitButton variant="secondary">Mark ready for outreach</SubmitButton>
          </form>
          <form action={updateSystemOutreachProspect}>
            <input type="hidden" name="outreachId" value={prospect.id} />
            <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />
            <input type="hidden" name="status" value={OutreachProspectStatus.CONTACTED} />
            <input type="hidden" name="dateContacted" value={today} />
            <SubmitButton variant="secondary">Mark email sent</SubmitButton>
          </form>
          <form action={updateSystemOutreachProspect}>
            <input type="hidden" name="outreachId" value={prospect.id} />
            <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />
            <input type="hidden" name="status" value={OutreachProspectStatus.FOLLOW_UP_DUE} />
            <SubmitButton variant="secondary">Mark follow-up due</SubmitButton>
          </form>
          <form action={updateSystemOutreachProspect}>
            <input type="hidden" name="outreachId" value={prospect.id} />
            <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />
            <input type="hidden" name="status" value={OutreachProspectStatus.REPLIED_INTERESTED} />
            <SubmitButton variant="secondary">Mark interested</SubmitButton>
          </form>
          <form action={updateSystemOutreachProspect}>
            <input type="hidden" name="outreachId" value={prospect.id} />
            <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />
            <input type="hidden" name="status" value={OutreachProspectStatus.TRIAL_CREATED} />
            <input type="hidden" name="trialCreated" value="true" />
            <SubmitButton variant="secondary">Mark trial created</SubmitButton>
          </form>
        </div>
      </Card>

      <Card className="grid gap-3 text-sm text-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-900">Next action tasks</p>
          <p className="mt-1 text-xs text-slate-600">Complete, skip, or cancel current outreach tasks. This guides daily work only; no email automation.</p>
        </div>

        <form action={markSystemOutreachCallAttempt} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="outreachId" value={prospect.id} />
          <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}?templateKey=${selectedTemplateKey}`} />
          <Field label="Call note (optional)">
            <input name="note" placeholder="Left voicemail, no answer, wrong number, etc." className={inputClassName} />
          </Field>
          <SubmitButton variant="secondary">Mark call attempted</SubmitButton>
        </form>

        {tasks.length === 0 ? (
          <p className="text-sm text-slate-600">No outreach tasks yet.</p>
        ) : (
          <ul className="grid gap-2">
            {tasks.map((task) => {
              const returnTo = `/system/outreach/${prospect.id}?templateKey=${selectedTemplateKey}`;
              const isOpen = task.status === "OPEN";
              return (
                <li key={task.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-600">{taskTypeLabel(task.type)} · {task.status} · due {dateText(task.dueDate)}</p>
                      {task.notes ? <p className="mt-1 text-xs text-slate-500">{task.notes}</p> : null}
                    </div>
                    {isOpen ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={completeSystemOutreachTask}>
                          <input type="hidden" name="outreachTaskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <SubmitButton variant="secondary">Complete</SubmitButton>
                        </form>
                        <form action={skipSystemOutreachTask}>
                          <input type="hidden" name="outreachTaskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <SubmitButton variant="secondary">Skip</SubmitButton>
                        </form>
                        <form action={cancelSystemOutreachTask}>
                          <input type="hidden" name="outreachTaskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <SubmitButton variant="secondary">Cancel</SubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="grid gap-3 text-sm text-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-900">Copy-ready email drafts</p>
          <p className="mt-1 text-xs text-slate-600">For manual outreach only. These drafts do not send email.</p>
        </div>
        <Field label="Email 1 draft">
          <textarea readOnly rows={10} value={email1Draft} className={textareaClassName} />
        </Field>
        <Field label="Follow-up draft">
          <textarea readOnly rows={10} value={followUpDraft} className={textareaClassName} />
        </Field>
      </Card>

      <Card className="grid gap-4 text-sm text-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-900">Outreach email send</p>
          <p className="mt-1 text-xs text-slate-600">Manual one-prospect send only. No bulk send or automation.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-600">Recipient</p>
            <p className="mt-1 text-sm text-slate-900">{prospect.email?.trim() || "No public email on this prospect."}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-600">Template</p>
            <form method="get" className="mt-1 flex gap-2">
              <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />
              <select name="templateKey" defaultValue={selectedTemplateKey} className={selectClassName}>
                {outreachEmailTemplateOptions.map((template) => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Preview</button>
            </form>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-600">From behavior</p>
            <p className="mt-1 text-sm text-slate-900">{senderPolicy.from}</p>
            <p className="mt-1 text-xs text-slate-600">{senderPolicy.note}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-600">Reply-To behavior</p>
            <p className="mt-1 text-sm text-slate-900">{senderPolicy.replyTo}</p>
            {!operatorHasAdjusterDeskEmail ? <p className="mt-1 text-xs text-slate-600">Operator email is not an @adjusterdesk.xyz address. Replies use configured fallback behavior.</p> : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Rendered subject">
            <input readOnly value={renderedTemplate?.subject ?? ""} className={inputClassName} />
          </Field>
          <Field label="Rendered body preview">
            <textarea readOnly rows={12} value={renderedTemplate?.body ?? ""} className={textareaClassName} />
          </Field>
        </div>

        <form action={sendSystemOutreachEmail} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="outreachId" value={prospect.id} />
          <input type="hidden" name="templateKey" value={selectedTemplateKey} />
          <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}?templateKey=${selectedTemplateKey}`} />
          <button
            type="submit"
            disabled={!hasRecipientEmail}
            className="inline-flex h-9 items-center justify-center rounded-md bg-teal-700 px-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Send email
          </button>
          {!hasRecipientEmail ? <span className="text-xs text-amber-700">No public email on this prospect.</span> : null}
        </form>
      </Card>

      <Card className="grid gap-3 text-sm text-slate-700">
        <div>
          <p className="text-sm font-semibold text-slate-900">Outreach activity</p>
          <p className="mt-1 text-xs text-slate-600">Recent outreach email attempts and outcomes for this prospect.</p>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-600">No outreach activity yet.</p>
        ) : (
          <ul className="grid gap-2">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-600">{activity.status} · {activity.type}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{activity.subject || "No subject"}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {dateTimeText(activity.createdAt)} · to {activity.recipientEmail || "-"} · from {activity.fromEmail || "-"} · reply-to {activity.replyToEmail || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-600">Template: {activity.templateKey || "-"} {activity.providerMessageId ? `· Message ID: ${activity.providerMessageId}` : ""}</p>
                {activity.errorMessage ? <p className="mt-1 text-xs text-rose-700">Error: {activity.errorMessage}</p> : null}
                <p className="mt-1 text-xs text-slate-500">By: {activity.createdByUser?.name || activity.createdByUser?.email || "System"}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <form action={updateSystemOutreachProspect} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="outreachId" value={prospect.id} />
          <input type="hidden" name="returnTo" value={`/system/outreach/${prospect.id}`} />

          <Field label="Firm name" required>
            <input name="firmName" defaultValue={prospect.firmName} required className={inputClassName} />
          </Field>
          <Field label="Website">
            <input name="website" defaultValue={prospect.website ?? ""} className={inputClassName} />
          </Field>
          <Field label="State">
            <input name="state" defaultValue={prospect.state ?? ""} className={inputClassName} />
          </Field>
          <Field label="Contact name">
            <input name="contactName" defaultValue={prospect.contactName ?? ""} className={inputClassName} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={prospect.email ?? ""} className={inputClassName} />
          </Field>
          <Field label="Source">
            <input name="source" defaultValue={prospect.source ?? ""} className={inputClassName} />
          </Field>
          <Field label="Small-office signal">
            <input name="smallOfficeSignal" defaultValue={prospect.smallOfficeSignal ?? ""} className={inputClassName} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={prospect.status} className={selectClassName}>
              {outreachStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Date contacted">
            <input name="dateContacted" type="date" defaultValue={dateInputValue(prospect.dateContacted)} className={inputClassName} />
          </Field>
          <Field label="Follow-up date">
            <input name="followUpDate" type="date" defaultValue={dateInputValue(prospect.followUpDate)} className={inputClassName} />
          </Field>
          <div className="xl:col-span-2">
            <Field label="Reply / objection">
              <input name="replyObjection" defaultValue={prospect.replyObjection ?? ""} className={inputClassName} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Notes">
              <textarea name="notes" rows={4} defaultValue={prospect.notes ?? ""} className={textareaClassName} />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2 xl:col-span-3">
            <input type="checkbox" name="trialCreated" defaultChecked={prospect.trialCreated} className="h-4 w-4 rounded border-slate-300" />
            Trial created
          </label>

          <div className="md:col-span-2 xl:col-span-3 flex gap-2">
            <SubmitButton>Save updates</SubmitButton>
            <ButtonLink href="/system/outreach" variant="secondary">Back</ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
