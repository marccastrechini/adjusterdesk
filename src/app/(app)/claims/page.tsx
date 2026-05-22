import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { claimStatusOptions } from "@/lib/options";
import { formatDate, formatMoney, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getClaims } from "@/lib/queries";
import { Badge, ButtonLink, Card, EmptyState, inputClassName, PageHeader, selectClassName, SubmitButton } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { claims, search, status } = await getClaims(params);

  return (
    <>
      <PageHeader
        title="Claims"
        description="Open, search, and track claim work by client, property, carrier, status, and assigned adjuster."
        actions={
          <>
            <ButtonLink href="/api/export/claims" variant="secondary">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export CSV
            </ButtonLink>
            <ButtonLink href="/claims/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New claim
            </ButtonLink>
          </>
        }
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/claims">
          <input name="q" defaultValue={search ?? ""} className={inputClassName} placeholder="Search client, claim number, address, carrier, or loss type" />
          <select name="status" defaultValue={status} className={selectClassName}>
            <option value="ALL">All statuses</option>
            {claimStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <SubmitButton variant="secondary">Filter</SubmitButton>
        </form>
      </Card>

      {claims.length === 0 ? (
        <EmptyState title="No claims found" message="Create a claim or clear the current filters." />
      ) : (
        <div className="grid gap-3">
          {claims.map((claim) => {
            const openTasks = claim.tasks.filter((task) => task.status === "OPEN").length;
            const openInvoiceCents = claim.invoices.reduce((sum, invoice) => sum + invoice.feeAmountCents - invoice.amountPaidCents, 0);
            return (
              <Card key={claim.id}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/claims/${claim.id}`} className="text-base font-semibold text-slate-950 hover:text-teal-800">
                        {fullName(claim.contact)}
                      </Link>
                      <Badge tone={claim.status === "SETTLED" ? "green" : claim.status === "WAITING_ON_CARRIER" ? "amber" : "slate"}>{labelFromEnum(claim.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{claim.lossType} · {propertyAddress(claim.property)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {claim.carrier?.name ?? "Carrier to confirm"} · Claim #{claim.claimNumber ?? "not set"} · Deadline {formatDate(claim.deadlineDate)}
                    </p>
                  </div>
                  <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-3 xl:min-w-[420px] xl:text-right">
                    <p>Assigned: {claim.assignedUser?.name ?? "Unassigned"}</p>
                    <p>Open tasks: {openTasks}</p>
                    <p>Receivable: {formatMoney(openInvoiceCents)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
