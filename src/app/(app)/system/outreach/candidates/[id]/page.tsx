import { notFound } from "next/navigation";
import { OutreachCandidateStatus } from "@/generated/prisma/client";
import {
  promoteOutreachCandidate,
  rejectOutreachCandidate,
  updateOutreachCandidate,
} from "@/lib/actions";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemOutreachCandidateById } from "@/lib/queries";
import { ButtonLink, Card, Field, Notice, PageHeader, SubmitButton, inputClassName, selectClassName, textareaClassName } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateText(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
}

const statusLabelMap: Record<OutreachCandidateStatus, string> = {
  NEW: "New",
  NEEDS_REVIEW: "Needs review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
  PROMOTED: "Promoted",
};

const editableStatusOptions: Array<{ value: OutreachCandidateStatus; label: string }> = [
  { value: OutreachCandidateStatus.NEW, label: "New" },
  { value: OutreachCandidateStatus.NEEDS_REVIEW, label: "Needs review" },
  { value: OutreachCandidateStatus.APPROVED, label: "Approved" },
  { value: OutreachCandidateStatus.DUPLICATE, label: "Duplicate" },
];

export default async function SystemOutreachCandidateDetailPage({ params, searchParams }: PageProps) {
  await requireSystemOutreachContext();
  const { id } = await params;
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);

  const candidate = await getSystemOutreachCandidateById(id);
  if (!candidate) {
    notFound();
  }

  const isTerminal = candidate.status === OutreachCandidateStatus.PROMOTED || candidate.status === OutreachCandidateStatus.REJECTED;

  return (
    <>
      <PageHeader
        title={candidate.firmName}
        description="Review this lead candidate before promoting to active outreach or rejecting."
        actions={
          <>
            <ButtonLink href="/system/outreach/candidates" variant="secondary">Back to candidates</ButtonLink>
          </>
        }
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {error === "update-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Candidate was not updated</p>
          <p className="mt-1 leading-6">Check the entered values and try again.</p>
        </Card>
      ) : null}
      {error === "promote-validation" ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Promotion failed</p>
          <p className="mt-1 leading-6">Could not promote this candidate. Try again or contact support.</p>
        </Card>
      ) : null}

      <Card className="text-sm text-slate-700">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Status</p>
            <p className="mt-1 font-medium text-slate-800">{statusLabelMap[candidate.status]}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Added</p>
            <p className="mt-1">{dateText(candidate.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Last updated</p>
            <p className="mt-1">{dateText(candidate.updatedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-slate-500">Confidence score</p>
            <p className="mt-1">
              {candidate.confidenceScore != null
                ? `${Math.round(candidate.confidenceScore * 100)}%`
                : "-"}
            </p>
          </div>
        </div>
        {candidate.promotedOutreachProspect ? (
          <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">Promoted prospect</p>
            <p className="mt-1 text-sm">
              <a href={`/system/outreach/${candidate.promotedOutreachProspect.id}`} className="text-teal-800 hover:underline">
                {candidate.promotedOutreachProspect.firmName}
              </a>
            </p>
          </div>
        ) : null}
      </Card>

      {!isTerminal ? (
        <Card className="text-sm text-slate-700">
          <p className="text-sm font-semibold text-slate-900">Review actions</p>
          <p className="mt-1 text-xs text-slate-600">
            Promote this candidate to an active outreach prospect, or reject it. Promoted candidates create an initial outreach task.
            Rejected candidates stay here for record-keeping but do not enter the prospect queue.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={promoteOutreachCandidate}>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="returnTo" value={`/system/outreach/candidates/${candidate.id}`} />
              <SubmitButton>Promote to prospect</SubmitButton>
            </form>
            <form action={rejectOutreachCandidate}>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="returnTo" value={`/system/outreach/candidates/${candidate.id}`} />
              <SubmitButton variant="secondary">Reject candidate</SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}

      {candidate.status === OutreachCandidateStatus.REJECTED ? (
        <Card className="border-slate-200 bg-slate-50 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Rejected</p>
          <p className="mt-1">This candidate was rejected and will not enter active outreach.</p>
        </Card>
      ) : null}

      <Card>
        <form action={updateOutreachCandidate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="candidateId" value={candidate.id} />
          <input type="hidden" name="returnTo" value={`/system/outreach/candidates/${candidate.id}`} />

          <Field label="Firm name" required>
            <input name="firmName" defaultValue={candidate.firmName} required className={inputClassName} />
          </Field>
          <Field label="Website">
            <input name="website" defaultValue={candidate.website ?? ""} className={inputClassName} />
          </Field>
          <Field label="State">
            <input name="state" defaultValue={candidate.state ?? ""} className={inputClassName} />
          </Field>
          <Field label="Contact name">
            <input name="contactName" defaultValue={candidate.contactName ?? ""} className={inputClassName} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={candidate.email ?? ""} className={inputClassName} />
          </Field>
          <Field label="Phone">
            <input name="phone" defaultValue={candidate.phone ?? ""} className={inputClassName} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Source URL">
              <input name="sourceUrl" defaultValue={candidate.sourceUrl ?? ""} placeholder="https://..." className={inputClassName} />
            </Field>
          </div>
          <Field label="Small-office signal">
            <input name="smallOfficeSignal" defaultValue={candidate.smallOfficeSignal ?? ""} className={inputClassName} />
          </Field>
          <Field label="Confidence score (0.0–1.0)">
            <input
              name="confidenceScore"
              type="number"
              min="0"
              max="1"
              step="0.01"
              defaultValue={candidate.confidenceScore?.toString() ?? ""}
              className={inputClassName}
            />
          </Field>
          {!isTerminal ? (
            <Field label="Status">
              <select name="status" defaultValue={candidate.status} className={selectClassName}>
                {editableStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          ) : (
            <input type="hidden" name="status" value={candidate.status} />
          )}
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Notes">
              <textarea name="notes" rows={4} defaultValue={candidate.notes ?? ""} className={textareaClassName} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <SubmitButton>Save updates</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
