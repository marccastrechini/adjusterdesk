import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { leadStatusOptions } from "@/lib/options";
import { formatDate, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getLeads } from "@/lib/queries";
import { Badge, ButtonLink, Card, EmptyState, inputClassName, PageHeader, selectClassName, SubmitButton } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { leads, search, status } = await getLeads(params);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Track new calls, referrals, follow-up dates, and intake notes before a claim is opened."
        actions={
          <>
            <ButtonLink href="/api/export/leads" variant="secondary">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export CSV
            </ButtonLink>
            <ButtonLink href="/leads/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New lead
            </ButtonLink>
          </>
        }
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/leads">
          <input name="q" defaultValue={search ?? ""} className={inputClassName} placeholder="Search client, address, source, or loss type" />
          <select name="status" defaultValue={status} className={selectClassName}>
            <option value="ALL">All statuses</option>
            {leadStatusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <SubmitButton variant="secondary">Filter</SubmitButton>
        </form>
      </Card>

      {leads.length === 0 ? (
        <EmptyState title="No leads found" message="Create a new lead or clear the current filters." />
      ) : (
        <div className="grid gap-3">
          {leads.map((lead) => (
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
                </div>
                <div className="text-sm text-slate-600 lg:text-right">
                  <p>Assigned to {lead.assignedUser?.name ?? "Unassigned"}</p>
                  {lead.convertedClaim ? (
                    <Link href={`/claims/${lead.convertedClaim.id}`} className="mt-1 inline-flex font-medium text-teal-800 hover:text-teal-900">
                      Open converted claim
                    </Link>
                  ) : (
                    <p className="mt-1">Created {formatDate(lead.createdAt)}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
