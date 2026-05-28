import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { leadStatusOptions } from "@/lib/options";
import { formatDate, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getLeads } from "@/lib/queries";
import { Badge, ButtonLink, Card, EmptyState, inputClassName, PageHeader, selectClassName, SubmitButton } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const followUpFilterOptions = [
  ["ALL", "All"],
  ["OVERDUE", "Overdue"],
  ["TODAY", "Due today"],
  ["UPCOMING", "Upcoming"],
  ["NO_DATE", "No follow-up date"],
] as const;

function dayStamp(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { leads, users, search, status } = await getLeads(params);
  const assignedUserId = (Array.isArray(params.assignedUserId) ? params.assignedUserId[0] : params.assignedUserId) ?? "ALL";
  const followUp = (Array.isArray(params.followUp) ? params.followUp[0] : params.followUp) ?? "ALL";
  const hasFilters = Boolean(search) || status !== "ALL" || assignedUserId !== "ALL" || followUp !== "ALL";
  const leadsExportParams = new URLSearchParams({
    status,
    assignedUserId,
    followUp,
  });
  if (search?.trim()) leadsExportParams.set("q", search.trim());
  const leadsExportHref = `/api/export/leads?${leadsExportParams.toString()}`;
  const todayStamp = dayStamp(new Date());

  const filteredLeads = leads.filter((lead) => {
    const matchesAssignedUser = assignedUserId === "ALL" || lead.assignedUserId === assignedUserId;
    const followUpStamp = lead.followUpDate ? dayStamp(lead.followUpDate) : null;
    const matchesFollowUp =
      followUp === "ALL" ||
      (followUp === "NO_DATE" && followUpStamp === null) ||
      (followUp === "OVERDUE" && followUpStamp !== null && followUpStamp < todayStamp) ||
      (followUp === "TODAY" && followUpStamp !== null && followUpStamp === todayStamp) ||
      (followUp === "UPCOMING" && followUpStamp !== null && followUpStamp > todayStamp);

    return matchesAssignedUser && matchesFollowUp;
  });

  const newMatchingLeads = filteredLeads.filter((lead) => lead.status === "NEW").length;
  const convertedMatchingLeads = filteredLeads.filter((lead) => lead.status === "CONVERTED").length;
  const followUpDueOrOverdue = filteredLeads.filter((lead) => lead.followUpDate && dayStamp(lead.followUpDate) <= todayStamp).length;
  const noLeadsYet = leads.length === 0 && !hasFilters;
  const noFilteredResults = filteredLeads.length === 0 && !noLeadsYet;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Track new calls, referrals, follow-up dates, and intake notes before a claim is opened."
        actions={
          <>
            <ButtonLink href="/leads/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New lead
            </ButtonLink>
          </>
        }
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_220px_220px_auto]" action="/leads">
          <input name="q" defaultValue={search ?? ""} className={inputClassName} placeholder="Search client, address, source, or loss type" />
          <select name="status" defaultValue={status} className={selectClassName}>
            <option value="ALL">All statuses</option>
            {leadStatusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select name="assignedUserId" defaultValue={assignedUserId} className={selectClassName}>
            <option value="ALL">All adjusters</option>
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <select name="followUp" defaultValue={followUp} className={selectClassName}>
            {followUpFilterOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <SubmitButton variant="secondary">Filter</SubmitButton>
            <ButtonLink href={leadsExportHref} variant="secondary">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export CSV
            </ButtonLink>
          </div>
        </form>
        {hasFilters ? (
          <div className="mt-3">
            <ButtonLink href="/leads" variant="secondary">Clear filters</ButtonLink>
          </div>
        ) : null}
      </Card>

      {noLeadsYet ? (
        <EmptyState title="No leads yet" message="Add the next intake so the office can start follow-up and convert it into a claim when ready." />
      ) : noFilteredResults ? (
        <Card className="grid gap-3">
          <p className="font-medium text-slate-950">No leads match these filters.</p>
          {hasFilters ? <div><ButtonLink href="/leads" variant="secondary">Clear filters</ButtonLink></div> : null}
        </Card>
      ) : (
        <>
          <Card className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Matching leads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredLeads.length} total</p>
              <p className="mt-1 text-sm text-slate-600">Based on the current lead filters.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">New leads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{newMatchingLeads} new</p>
              <p className="mt-1 text-sm text-slate-600">Leads still in intake.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Follow-up due/overdue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{followUpDueOrOverdue} leads</p>
              <p className="mt-1 text-sm text-slate-600">Leads needing a same-day or past-due follow-up.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Converted</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{convertedMatchingLeads} converted</p>
              <p className="mt-1 text-sm text-slate-600">Leads already opened as claims.</p>
            </div>
          </Card>

          <div className="grid gap-3">
            {filteredLeads.map((lead) => {
              const followUpStamp = lead.followUpDate ? dayStamp(lead.followUpDate) : null;
              const followUpDueOrOverdue = followUpStamp !== null && followUpStamp <= todayStamp;
              const openLeadActionClassName =
                followUpDueOrOverdue
                  ? "inline-flex h-8 items-center justify-center rounded-md border border-teal-300 bg-teal-50 px-3 text-sm font-medium text-teal-900 transition hover:bg-teal-100"
                  : "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
              const followUpTaskActionClassName =
                followUpDueOrOverdue
                  ? "inline-flex h-8 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                  : "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
              const convertActionClassName =
                lead.status === "NEW"
                  ? "inline-flex h-8 items-center justify-center rounded-md border border-teal-300 bg-teal-50 px-3 text-sm font-medium text-teal-900 transition hover:bg-teal-100"
                  : "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

              return (
                <Card key={lead.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/leads/${lead.id}`} className="text-base font-semibold text-slate-950 hover:text-teal-800">
                          {fullName(lead.contact)}
                        </Link>
                        <Badge tone={lead.status === "CONVERTED" ? "green" : lead.status === "NEW" ? "teal" : "slate"}>{labelFromEnum(lead.status)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{lead.lossType} · {propertyAddress(lead.property)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Source: {lead.source}{lead.referralSource ? ` · ${lead.referralSource}` : ""} · Follow-up {formatDate(lead.followUpDate)}
                      </p>
                      {lead.notes ? <p className="mt-2 text-sm leading-6 text-slate-700">{lead.notes}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/leads/${lead.id}`} className={openLeadActionClassName}>
                          Open lead
                        </Link>
                        <Link href={`/leads/${lead.id}?action=activity`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                          Log note or call
                        </Link>
                        <Link href={`/leads/${lead.id}?action=task`} className={followUpTaskActionClassName}>
                          Add follow-up task
                        </Link>
                        {lead.convertedClaim ? (
                          <Link href={`/claims/${lead.convertedClaim.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100">
                            Open converted claim
                          </Link>
                        ) : (
                          <Link href={`/leads/${lead.id}?action=convert`} className={convertActionClassName}>
                            Convert to claim
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 lg:text-right">
                      <p>Assigned to {lead.assignedUser?.name ?? "Unassigned"}</p>
                      <p className="mt-1">Follow-up {formatDate(lead.followUpDate)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
