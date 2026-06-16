import { notFound } from "next/navigation";
import { OutreachProspectStatus } from "@/generated/prisma/client";
import { updateSystemOutreachProspect } from "@/lib/actions";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemOutreachProspectById } from "@/lib/queries";
import { ButtonLink, Card, Field, Notice, PageHeader, SubmitButton, inputClassName, selectClassName, textareaClassName } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const outreachStatusOptions: Array<{ value: OutreachProspectStatus; label: string }> = [
  { value: OutreachProspectStatus.NOT_CONTACTED, label: "Not contacted" },
  { value: OutreachProspectStatus.CONTACTED, label: "Contacted" },
  { value: OutreachProspectStatus.FOLLOW_UP_DUE, label: "Follow-up due" },
  { value: OutreachProspectStatus.REPLIED_INTERESTED, label: "Replied - interested" },
  { value: OutreachProspectStatus.REPLIED_NOT_NOW, label: "Replied - not now" },
  { value: OutreachProspectStatus.TRIAL_CREATED, label: "Trial created" },
  { value: OutreachProspectStatus.BAD_FIT, label: "Bad fit" },
];

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

  return (
    <>
      <PageHeader
        title={prospect.firmName}
        description="Update outreach status, follow-up, contact activity, and notes."
        actions={<ButtonLink href="/system/outreach" variant="secondary">Back to outreach queue</ButtonLink>}
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
