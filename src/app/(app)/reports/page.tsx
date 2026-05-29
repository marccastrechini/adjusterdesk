import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { formatDate, formatMoney, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum } from "@/lib/format";
import { getReportsData } from "@/lib/queries";
import { buildSettlementsByMonth } from "@/lib/reports";

function SummaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block h-full rounded-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
      {children}
    </Link>
  );
}

export default async function ReportsPage() {
  const {
    openClaimsByStatus,
    openClaimsCount,
    leadStatusCounts,
    leadSourceCounts,
    claimSourceCounts,
    overdueTasks,
    overdueTaskCount,
    upcomingDeadlines,
    upcomingDeadlineCount,
    leadFollowUpDueCount,
    receivables,
    receivableCents,
    recentSettlements,
    acceptedSettlementCents,
    settlementsForMonthly,
  } = await getReportsData();

  const settlementsByMonth = buildSettlementsByMonth(settlementsForMonthly);

  return (
    <>
      <PageHeader title="Reports" description="Simple office snapshots for open claims, overdue tasks, deadlines, lead sources, and outstanding receivables." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryLink href="/claims">
          <StatCard label="Open claims" value={openClaimsCount} detail="Claims still being worked" />
        </SummaryLink>
        <SummaryLink href="/today">
          <StatCard label="Overdue tasks" value={overdueTaskCount} detail="Tasks past due right now" />
        </SummaryLink>
        <SummaryLink href="/today">
          <StatCard label="Upcoming deadlines" value={upcomingDeadlineCount} detail="Claim deadlines in the next 30 days" />
        </SummaryLink>
        <SummaryLink href="/leads?status=ALL&assignedUserId=ALL&followUp=OVERDUE">
          <StatCard label="Leads needing follow-up" value={leadFollowUpDueCount} detail="Open leads that are past due" />
        </SummaryLink>
        <SummaryLink href="/money?bucket=UNPAID">
          <StatCard label="Outstanding receivables" value={formatMoney(receivableCents)} detail="Sent, partially paid, or overdue invoices" />
        </SummaryLink>
        <SummaryLink href="#settlement-activity">
          <StatCard label="Settlement activity" value={formatMoney(acceptedSettlementCents)} detail="Accepted settlement totals" />
        </SummaryLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Open claims by status">
          {openClaimsByStatus.length === 0 ? (
            <EmptyState
              title="No open claims"
              message="There are no active claims right now. Add a claim or convert a lead when the office is ready."
              actions={<ButtonLink href="/claims/new" variant="secondary">Add claim</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {openClaimsByStatus.map((item) => (
                <Link
                  key={item.status}
                  href={`/claims?status=${item.status}&assignedUserId=ALL&carrierId=ALL`}
                  className="block rounded-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  <Card className="flex items-center justify-between">
                    <Badge tone={item.status === "WAITING_ON_CARRIER" ? "amber" : item.status === "WAITING_ON_CLIENT" ? "blue" : item.status === "NEGOTIATING" ? "teal" : "slate"}>{labelFromEnum(item.status)}</Badge>
                    <p className="text-lg font-semibold text-slate-950">{item._count?._all ?? 0}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title="Leads by status">
          {leadStatusCounts.length === 0 ? (
            <EmptyState
              title="No leads yet"
              message="There are no leads in the office yet. Add the next intake or import a simple lead CSV."
              actions={
                <>
                  <ButtonLink href="/leads/new" variant="secondary">Add lead</ButtonLink>
                  <ButtonLink href="/settings/import" variant="secondary">Import CSV</ButtonLink>
                </>
              }
            />
          ) : (
            <div className="grid gap-3">
              {leadStatusCounts.map((item) => (
                <Link
                  key={item.status}
                  href={`/leads?status=${item.status}&assignedUserId=ALL&followUp=ALL`}
                  className="block rounded-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  <Card className="flex items-center justify-between">
                    <p className="font-medium text-slate-950">{labelFromEnum(item.status)}</p>
                    <p className="text-lg font-semibold text-slate-950">{item._count?._all ?? 0}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Lead sources">
          {leadSourceCounts.length === 0 ? (
            <EmptyState
              title="No lead sources yet"
              message="Lead sources will show up here after the office starts entering leads."
              actions={<ButtonLink href="/leads/new" variant="secondary">Add lead</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {leadSourceCounts.map((item) => (
                <Card key={item.source} className="flex items-center justify-between">
                  <p className="font-medium text-slate-950">{item.source}</p>
                  <p className="text-lg font-semibold text-slate-950">{item._count?._all ?? 0}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Claims by source" description="Counts converted claims grouped by the source of the original lead.">
          {claimSourceCounts.length === 0 ? (
            <EmptyState
              title="No claim sources yet"
              message="Claim sources appear here once leads are converted to claims."
              actions={<ButtonLink href="/leads" variant="secondary">Open leads</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {claimSourceCounts.map((item) => (
                <Card key={item.source} className="flex items-center justify-between">
                  <p className="font-medium text-slate-950">{item.source}</p>
                  <p className="text-lg font-semibold text-slate-950">{item._count?._all ?? 0}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Overdue tasks">
          {overdueTasks.length === 0 ? (
            <EmptyState
              title="No overdue tasks right now"
              message="There are no open tasks past due. Open Today to review upcoming follow-ups."
              actions={<ButtonLink href="/today" variant="secondary">Open Today</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {overdueTasks.map((task) => (
                <Card key={task.id}>
                  <Link href={task.claim ? `/claims/${task.claim.id}/tasks` : task.lead ? `/leads/${task.lead.id}` : "/today"} className="font-semibold text-slate-950 hover:text-teal-800">
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    {task.claim ? fullName(task.claim.contact) : task.lead ? fullName(task.lead.contact) : "General"} · Due {formatDate(task.dueDate)} · {task.assignedUser?.name ?? "Unassigned"}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Upcoming deadlines">
          {upcomingDeadlines.length === 0 ? (
            <EmptyState
              title="No upcoming deadlines right now"
              message="No open claim deadlines are due in the next 30 days. Add deadline dates on claim task pages when they matter."
              actions={<ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {upcomingDeadlines.map((claim) => (
                <Card key={claim.id}>
                  <Link href={`/claims/${claim.id}`} className="font-semibold text-slate-950 hover:text-teal-800">
                    {fullName(claim.contact)} · {claim.lossType}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">Deadline {formatDate(claim.deadlineDate)} · {claim.carrier?.name ?? "Carrier to confirm"}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Outstanding receivables">
          {receivables.length === 0 ? (
            <EmptyState
              title="No outstanding receivables right now"
              message="No sent, partially paid, or overdue invoices are open. Create fee invoices from claim money pages after settlement."
              actions={<ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {receivables.map((invoice) => (
                <Card key={invoice.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/claims/${invoice.claim.id}/money`} className="font-semibold text-slate-950 hover:text-teal-800">{invoice.invoiceNumber} · {fullName(invoice.claim.contact)}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>Due {formatDate(invoice.dueAt)}</span>
                      <Badge tone={invoiceStatusTone(invoice)}>{invoiceDisplayStatus(invoice)}</Badge>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-slate-950">{formatMoney(invoiceAmountDue(invoice))}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Settlements by month" description="Accepted settlement totals for the last 12 months. Use this to see when claims close and money comes in.">
          {settlementsByMonth.length === 0 ? (
            <EmptyState
              title="No settlements recorded yet"
              message="Accepted settlements will appear here by month once the office records them on claim money pages."
              actions={<ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {settlementsByMonth.map((row) => (
                <Card key={row.monthKey} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{row.monthLabel}</p>
                    <p className="text-sm text-slate-600">{row.count} settlement{row.count === 1 ? "" : "s"}</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-950">{formatMoney(row.totalCents)}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Recent settlement rounds" description="Accepted settlement rounds the office has already worked through." >
        <div id="settlement-activity">
          {recentSettlements.length === 0 ? (
            <EmptyState
              title="No settlement activity yet"
              message="Accepted settlements will appear here once the office records them on claim money pages."
              actions={<ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>}
            />
          ) : (
            <div className="grid gap-3">
              {recentSettlements.map((round) => (
                <Card key={round.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/claims/${round.claim.id}/money`} className="font-semibold text-slate-950 hover:text-teal-800">
                      {fullName(round.claim.contact)} · Round {round.roundNumber}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      Accepted {formatMoney(round.acceptedAmountCents ?? 0)} · {round.offeredAt ? `Offered ${formatDate(round.offeredAt)}` : "No offer date set"}
                    </p>
                  </div>
                  <Badge tone="green">Accepted</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
