import { OutreachProspectStatus } from "@/generated/prisma/client";
import { createSystemOutreachProspect, updateSystemOutreachProspect } from "@/lib/actions";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemOutreachProspects } from "@/lib/queries";
import { Badge, ButtonLink, Card, Field, Notice, PageHeader, Section, SubmitButton, inputClassName, selectClassName, textareaClassName } from "@/components/ui";

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

function statusLabel(status: OutreachProspectStatus) {
  return outreachStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export default async function SystemOutreachPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const { prospects, statusCountMap, total } = await getSystemOutreachProspects();

  const errorMessage =
    error === "create-validation"
      ? "Prospect was not added. Check required fields and validation."
      : error === "update-validation"
        ? "Prospect was not updated. Check the entered values."
        : error === "missing"
          ? "That outreach prospect was not found."
          : undefined;

  return (
    <>
      <PageHeader
        title="System outreach"
        description="Internal operator tracker for the first 25 direct outreach prospects."
        actions={<ButtonLink href="/system" variant="secondary">System dashboard</ButtonLink>}
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Outreach update not completed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Tracked prospects</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{total}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Not contacted</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.NOT_CONTACTED}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Follow-up due</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.FOLLOW_UP_DUE}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Trial created</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.TRIAL_CREATED}</p>
        </Card>
      </div>

      <Section title="Add outreach prospect" description="Keep this simple: one row per firm to track contact attempts and follow-up.">
        <Card>
          <form action={createSystemOutreachProspect} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
            <div className="md:col-span-2 xl:col-span-3">
              <SubmitButton>Add prospect</SubmitButton>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Outreach prospects" description="Most recent rows first. Update status, follow-up, objection, trial flag, and notes inline.">
        <Card className="overflow-x-auto">
          <table className="min-w-[1200px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                <th scope="col" className="px-2 py-2 font-semibold">Firm</th>
                <th scope="col" className="px-2 py-2 font-semibold">Website</th>
                <th scope="col" className="px-2 py-2 font-semibold">State</th>
                <th scope="col" className="px-2 py-2 font-semibold">Contact</th>
                <th scope="col" className="px-2 py-2 font-semibold">Email</th>
                <th scope="col" className="px-2 py-2 font-semibold">Source</th>
                <th scope="col" className="px-2 py-2 font-semibold">Small-office signal</th>
                <th scope="col" className="px-2 py-2 font-semibold">Date contacted</th>
                <th scope="col" className="px-2 py-2 font-semibold">Update</th>
                <th scope="col" className="px-2 py-2 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {prospects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-6 text-center text-sm text-slate-600">No outreach prospects yet.</td>
                </tr>
              ) : (
                prospects.map((prospect) => (
                  <tr key={prospect.id} className="border-b border-slate-100 align-top text-slate-700 last:border-b-0">
                    <td className="px-2 py-2">
                      <p className="font-semibold text-slate-950">{prospect.firmName}</p>
                    </td>
                    <td className="px-2 py-2">
                      {prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer" className="text-teal-800 hover:text-teal-900">{prospect.website}</a> : "-"}
                    </td>
                    <td className="px-2 py-2">{prospect.state ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.contactName ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.email ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.source ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.smallOfficeSignal ?? "-"}</td>
                    <td className="px-2 py-2">{dateText(prospect.dateContacted)}</td>
                    <td className="px-2 py-2">
                      <form action={updateSystemOutreachProspect} className="grid gap-2">
                        <input type="hidden" name="outreachId" value={prospect.id} />
                        <select name="status" defaultValue={prospect.status} className={selectClassName}>
                          {outreachStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input name="followUpDate" type="date" defaultValue={dateInputValue(prospect.followUpDate)} className={inputClassName} />
                        <input name="replyObjection" defaultValue={prospect.replyObjection ?? ""} className={inputClassName} />
                        <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                          <input type="checkbox" name="trialCreated" defaultChecked={prospect.trialCreated} className="h-4 w-4 rounded border-slate-300" />
                          Trial created
                        </label>
                        <textarea name="notes" rows={2} defaultValue={prospect.notes ?? ""} className={textareaClassName} />
                        <SubmitButton variant="secondary">Save</SubmitButton>
                      </form>
                      <div className="mt-2"><Badge>{statusLabel(prospect.status)}</Badge></div>
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-600">{dateText(prospect.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </Section>
    </>
  );
}
