import { notFound } from "next/navigation";
import { OutreachProspectStatus } from "@/generated/prisma/client";
import { updateSystemOutreachProspect } from "@/lib/actions";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { freeClaimTrackerUrl, outreachStatusGuide, outreachStatusOptions, trialSignupUrl } from "@/lib/outreach";
import { getSystemOutreachProspectById } from "@/lib/queries";
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

function formatDraftText(contactName: string | null, body: string) {
  const greeting = contactName?.trim() ? `Hi ${contactName.trim()},` : "Hi there,";
  return `${greeting}\n\n${body}\n\nThanks,\nAdjusterDesk`;
}

export default async function SystemOutreachProspectPage({ params, searchParams }: PageProps) {
  await requireSystemOutreachContext();
  const { id } = await params;
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);

  const prospect = await getSystemOutreachProspectById(id);
  if (!prospect) {
    notFound();
  }

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
