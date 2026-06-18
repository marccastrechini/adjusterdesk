import Link from "next/link";
import { OutreachCandidateStatus } from "@/generated/prisma/client";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { getSystemOutreachCandidates } from "@/lib/queries";
import { Badge, ButtonLink, Card, Notice, PageHeader, Section } from "@/components/ui";

type PageProps = {
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

function candidateStatusLabel(status: OutreachCandidateStatus) {
  return statusLabelMap[status] ?? status;
}

type CandidateFilter = "active" | "promoted" | "rejected" | "all";

const filterOptions: Array<{ value: CandidateFilter; label: string }> = [
  { value: "active", label: "Active (needs review)" },
  { value: "promoted", label: "Promoted" },
  { value: "rejected", label: "Rejected / Duplicate" },
  { value: "all", label: "All" },
];

function filterFromQuery(value: string | undefined): CandidateFilter {
  if (!value) return "active";
  return filterOptions.some((f) => f.value === value) ? (value as CandidateFilter) : "active";
}

export default async function SystemOutreachCandidatesPage({ searchParams }: PageProps) {
  await requireSystemOutreachContext();
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const filter = filterFromQuery(firstValue(query.filter));

  const allCandidates = await getSystemOutreachCandidates();

  const activeStatuses: OutreachCandidateStatus[] = [
    OutreachCandidateStatus.NEW,
    OutreachCandidateStatus.NEEDS_REVIEW,
    OutreachCandidateStatus.APPROVED,
  ];
  const rejectedStatuses: OutreachCandidateStatus[] = [
    OutreachCandidateStatus.REJECTED,
    OutreachCandidateStatus.DUPLICATE,
  ];

  const visibleCandidates = allCandidates.filter((c) => {
    if (filter === "active") return activeStatuses.includes(c.status);
    if (filter === "promoted") return c.status === OutreachCandidateStatus.PROMOTED;
    if (filter === "rejected") return rejectedStatuses.includes(c.status);
    return true;
  });

  const activeCount = allCandidates.filter((c) => activeStatuses.includes(c.status)).length;
  const totalCount = allCandidates.length;

  const errorMessage =
    error === "create-validation" ? "Candidate was not added. Check required fields." :
    error === "update-validation" ? "Candidate was not updated. Check the entered values." :
    error === "candidate-duplicate" ? "A candidate with this firm name or website already exists in the active intake queue. Review or update the existing candidate." :
    undefined;

  return (
    <>
      <PageHeader
        title="Lead candidates"
        description="AI-sourced or manually added leads pending review before entering the active outreach queue."
        actions={
          <>
            <ButtonLink href="/system/outreach" variant="secondary">Back to outreach queue</ButtonLink>
            <ButtonLink href="/system/outreach/candidates/new">Add candidate</ButtonLink>
          </>
        }
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Candidate intake error</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="text-sm text-slate-700">
        <p className="text-xs font-medium uppercase tracking-normal text-slate-500">About candidate intake</p>
        <p className="mt-2 leading-6">
          Lead candidates are AI-discovered or manually added leads that require human review before entering active outreach.
          Review each candidate, update notes, then promote to a prospect or reject.
          Promoted candidates become outreach prospects and receive an initial task.
        </p>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <span className="font-semibold text-slate-900">{activeCount}</span>
            <span className="ml-1 text-slate-600">needing review</span>
          </div>
          <div>
            <span className="font-semibold text-slate-900">{totalCount}</span>
            <span className="ml-1 text-slate-600">total</span>
          </div>
        </div>
      </Card>

      <Section
        title="Candidate queue"
        description="Review leads before promoting to active outreach. Only promoted candidates enter the prospect queue."
        actions={
          <form method="get" className="flex items-center gap-2 text-sm">
            <label htmlFor="filter" className="text-slate-600">Show</label>
            <select id="filter" name="filter" defaultValue={filter} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-950">
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Apply</button>
          </form>
        }
      >
        <Card className="overflow-x-auto">
          <table className="min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                <th scope="col" className="px-2 py-2 font-semibold">Firm</th>
                <th scope="col" className="px-2 py-2 font-semibold">Status</th>
                <th scope="col" className="px-2 py-2 font-semibold">Contact</th>
                <th scope="col" className="px-2 py-2 font-semibold">Email</th>
                <th scope="col" className="px-2 py-2 font-semibold">State</th>
                <th scope="col" className="px-2 py-2 font-semibold">Score</th>
                <th scope="col" className="px-2 py-2 font-semibold">Added</th>
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-sm text-slate-600">No candidates match this filter.</td>
                </tr>
              ) : (
                visibleCandidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-slate-100 align-top text-slate-700 last:border-b-0">
                    <td className="px-2 py-2">
                      <Link href={`/system/outreach/candidates/${candidate.id}`} className="font-semibold text-teal-800 hover:text-teal-900 hover:underline">
                        {candidate.firmName}
                      </Link>
                      {candidate.website ? (
                        <p className="text-xs text-slate-500">{candidate.website}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2"><Badge>{candidateStatusLabel(candidate.status)}</Badge></td>
                    <td className="px-2 py-2">{candidate.contactName ?? "-"}</td>
                    <td className="px-2 py-2">{candidate.email ?? "-"}</td>
                    <td className="px-2 py-2">{candidate.state ?? "-"}</td>
                    <td className="px-2 py-2">
                      {candidate.confidenceScore != null
                        ? `${Math.round(candidate.confidenceScore * 100)}%`
                        : "-"}
                    </td>
                    <td className="px-2 py-2">{dateText(candidate.createdAt)}</td>
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
