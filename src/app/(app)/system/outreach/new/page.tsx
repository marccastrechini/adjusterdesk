import { OutreachProspectStatus } from "@/generated/prisma/client";
import { createSystemOutreachProspect } from "@/lib/actions";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { ButtonLink, Card, Field, Notice, PageHeader, SubmitButton, inputClassName, selectClassName, textareaClassName } from "@/components/ui";

type PageProps = {
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

export default async function SystemOutreachNewPage({ searchParams }: PageProps) {
  await requireSystemOutreachContext();
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);

  return (
    <>
      <PageHeader
        title="Add outreach prospect"
        description="Manual add is available for new prospects discovered during outreach research."
        actions={<ButtonLink href="/system/outreach" variant="secondary">Back to outreach queue</ButtonLink>}
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {error === "create-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Prospect was not added</p>
          <p className="mt-1 leading-6">Check required fields and validation.</p>
        </Card>
      ) : null}

      <Card>
        <form action={createSystemOutreachProspect} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="returnTo" value="/system/outreach" />
          <Field label="Firm name" required>
            <input name="firmName" required className={inputClassName} />
          </Field>
          <Field label="Website">
            <input name="website" placeholder="https://..." className={inputClassName} />
          </Field>
          <Field label="State">
            <input name="state" className={inputClassName} />
          </Field>
          <Field label="Contact name">
            <input name="contactName" className={inputClassName} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputClassName} />
          </Field>
          <Field label="Source">
            <input name="source" placeholder="Directory, referral, manual search" className={inputClassName} />
          </Field>
          <Field label="Small-office signal" hint="Short reason this looks like a solo to 5-person office.">
            <input name="smallOfficeSignal" className={inputClassName} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={OutreachProspectStatus.NOT_CONTACTED} className={selectClassName}>
              {outreachStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Date contacted">
            <input name="dateContacted" type="date" className={inputClassName} />
          </Field>
          <Field label="Follow-up date">
            <input name="followUpDate" type="date" className={inputClassName} />
          </Field>
          <div className="xl:col-span-2">
            <Field label="Reply / objection">
              <input name="replyObjection" className={inputClassName} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Notes">
              <textarea name="notes" rows={3} className={textareaClassName} />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2 xl:col-span-3">
            <input type="checkbox" name="trialCreated" className="h-4 w-4 rounded border-slate-300" />
            Trial created
          </label>
          <div className="md:col-span-2 xl:col-span-3 flex gap-2">
            <SubmitButton>Add prospect</SubmitButton>
            <ButtonLink href="/system/outreach" variant="secondary">Cancel</ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
