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
  const { claims, users, search, status } = await getClaims(params);
  const assignedUserId = (Array.isArray(params.assignedUserId) ? params.assignedUserId[0] : params.assignedUserId) ?? "ALL";
  const carrierId = (Array.isArray(params.carrierId) ? params.carrierId[0] : params.carrierId) ?? "ALL";
  const hasFilters = Boolean(search) || status !== "ALL" || assignedUserId !== "ALL" || carrierId !== "ALL";
  const claimsExportParams = new URLSearchParams({
    status,
    assignedUserId,
    carrierId,
  });
  if (search?.trim()) claimsExportParams.set("q", search.trim());
  const claimsExportHref = `/api/export/claims?${claimsExportParams.toString()}`;

  const carrierOptions = Array.from(
    new Map(
      claims
        .filter((claim) => Boolean(claim.carrier))
        .map((claim) => [claim.carrier!.id, claim.carrier!.name]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filteredClaims = claims.filter((claim) => {
    const matchesAssignedUser = assignedUserId === "ALL" || claim.assignedUserId === assignedUserId;
    const matchesCarrier = carrierId === "ALL" || claim.carrierId === carrierId;
    return matchesAssignedUser && matchesCarrier;
  });

  const activeClaimStatuses = new Set(["NEW", "IN_REVIEW", "WAITING_ON_CLIENT", "WAITING_ON_CARRIER", "ESTIMATE_SENT", "NEGOTIATING"]);
  const activeClaimsCount = filteredClaims.filter((claim) => activeClaimStatuses.has(claim.status)).length;
  const waitingOnClientCount = filteredClaims.filter((claim) => claim.status === "WAITING_ON_CLIENT").length;
  const waitingOnCarrierCount = filteredClaims.filter((claim) => claim.status === "WAITING_ON_CARRIER").length;
  const noClaimsYet = claims.length === 0 && !hasFilters;
  const noFilteredResults = filteredClaims.length === 0 && !noClaimsYet;

  return (
    <>
      <PageHeader
        title="Claims"
        description="Open, search, and track claim work by client, property, carrier, status, and assigned adjuster."
        actions={
          <>
            <ButtonLink href="/claims/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New claim
            </ButtonLink>
          </>
        }
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_220px_220px_auto]" action="/claims">
          <input name="q" defaultValue={search ?? ""} className={inputClassName} placeholder="Search client, claim number, address, carrier, or loss type" />
          <select name="status" defaultValue={status} className={selectClassName}>
            <option value="ALL">All statuses</option>
            {claimStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="assignedUserId" defaultValue={assignedUserId} className={selectClassName}>
            <option value="ALL">All adjusters</option>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select name="carrierId" defaultValue={carrierId} className={selectClassName}>
            <option value="ALL">All carriers</option>
            <option value="">Carrier to confirm</option>
            {carrierOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <div className="flex items-center gap-3">
            <SubmitButton variant="secondary">Filter</SubmitButton>
            <ButtonLink href={claimsExportHref} variant="secondary">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export CSV
            </ButtonLink>
          </div>
        </form>
        {hasFilters ? (
          <div className="mt-3">
            <ButtonLink href="/claims" variant="secondary">Clear filters</ButtonLink>
          </div>
        ) : null}
      </Card>

      {noClaimsYet ? (
        <EmptyState title="No claims yet" message="Open the first claim from a lead or create one directly to start tracking tasks, deadlines, and money." />
      ) : noFilteredResults ? (
        <Card className="grid gap-3">
          <p className="font-medium text-slate-950">No claims match these filters.</p>
          {hasFilters ? <div><ButtonLink href="/claims" variant="secondary">Clear filters</ButtonLink></div> : null}
        </Card>
      ) : (
        <>
          <Card className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Matching claims</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredClaims.length} total</p>
              <p className="mt-1 text-sm text-slate-600">Based on the current claim filters.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Open / active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{activeClaimsCount} active</p>
              <p className="mt-1 text-sm text-slate-600">Claims still being worked by the office.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Waiting on client</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{waitingOnClientCount} claims</p>
              <p className="mt-1 text-sm text-slate-600">Claims blocked on client response or documents.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Waiting on carrier</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{waitingOnCarrierCount} claims</p>
              <p className="mt-1 text-sm text-slate-600">Claims pending carrier review or action.</p>
            </div>
          </Card>

          <div className="grid gap-3">
            {filteredClaims.map((claim) => {
              const openTasks = claim.tasks.filter((task) => task.status === "OPEN").length;
              const openInvoiceCents = claim.invoices.reduce((sum, invoice) => sum + invoice.feeAmountCents - invoice.amountPaidCents, 0);
              const tasksActionClassName =
                openTasks > 0
                  ? "inline-flex h-8 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                  : "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
              const moneyActionClassName =
                openInvoiceCents > 0
                  ? "inline-flex h-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                  : "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
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
                      <p className="mt-1 text-sm leading-6 text-slate-700">Next step: {claim.nextStep ?? "Open the claim and set the next office action."}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/claims/${claim.id}`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                          Open claim
                        </Link>
                        <Link href={`/claims/${claim.id}/tasks`} className={tasksActionClassName}>
                          Tasks{openTasks > 0 ? ` (${openTasks})` : ""}
                        </Link>
                        <Link href={`/claims/${claim.id}/documents`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                          Documents
                        </Link>
                        <Link href={`/claims/${claim.id}/communications?action=log-communication`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                          Log note
                        </Link>
                        <Link href={`/claims/${claim.id}/money`} className={moneyActionClassName}>
                          Money{openInvoiceCents > 0 ? ` (${formatMoney(openInvoiceCents)})` : ""}
                        </Link>
                      </div>
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
        </>
      )}
    </>
  );
}
