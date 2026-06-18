import { OutreachCandidateStatus } from "@/generated/prisma/client";
import { createOutreachCandidate } from "@/lib/actions";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { ButtonLink, Card, Field, Notice, PageHeader, SubmitButton, inputClassName, selectClassName, textareaClassName } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const statusOptions: Array<{ value: OutreachCandidateStatus; label: string }> = [
  { value: OutreachCandidateStatus.NEW, label: "New" },
  { value: OutreachCandidateStatus.NEEDS_REVIEW, label: "Needs review" },
  { value: OutreachCandidateStatus.APPROVED, label: "Approved" },
];

export default async function SystemOutreachCandidatesNewPage({ searchParams }: PageProps) {
  await requireSystemOutreachContext();
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);

  return (
    <>
      <PageHeader
        title="Add lead candidate"
        description="Manually add a lead candidate for review before promoting to active outreach."
        actions={<ButtonLink href="/system/outreach/candidates" variant="secondary">Back to candidates</ButtonLink>}
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {error === "create-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Candidate was not added</p>
          <p className="mt-1 leading-6">Check required fields and validation.</p>
        </Card>
      ) : null}
      {error === "candidate-duplicate" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Duplicate candidate</p>
          <p className="mt-1 leading-6">A candidate with this firm name or website already exists in the active intake queue.</p>
        </Card>
      ) : null}

      <Card className="text-sm text-slate-700">
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Candidate intake</p>
        <p className="mt-2 leading-6">
          Use this form to add a lead candidate discovered through research. The candidate will remain here for review
          until you promote it to an active prospect. Do not promote blindly — verify the firm looks like a small public
          adjusting office before promoting.
        </p>
      </Card>

      <Card>
        <form action={createOutreachCandidate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="returnTo" value="/system/outreach/candidates/new" />
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
          <Field label="Phone">
            <input name="phone" className={inputClassName} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Source URL" hint="Where this lead was discovered (directory listing, search result, etc.)">
              <input name="sourceUrl" placeholder="https://..." className={inputClassName} />
            </Field>
          </div>
          <Field label="Small-office signal" hint="Short reason this looks like a solo to 5-person office.">
            <input name="smallOfficeSignal" className={inputClassName} />
          </Field>
          <Field label="Confidence score (0.0–1.0)" hint="Optional. Used when AI research provides a relevance score.">
            <input name="confidenceScore" type="number" min="0" max="1" step="0.01" placeholder="e.g. 0.85" className={inputClassName} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={OutreachCandidateStatus.NEW} className={selectClassName}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Notes">
              <textarea name="notes" rows={3} placeholder="Why this prospect was flagged, any caveats, etc." className={textareaClassName} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3 flex gap-2">
            <SubmitButton>Add candidate</SubmitButton>
            <ButtonLink href="/system/outreach/candidates" variant="secondary">Cancel</ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
