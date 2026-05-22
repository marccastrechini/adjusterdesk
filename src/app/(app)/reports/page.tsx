import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { formatDate, formatMoney, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum } from "@/lib/format";
import { getReportsData } from "@/lib/queries";

export default async function ReportsPage() {
  const { claimsByStatus, overdueTasks, upcomingDeadlines, leadsBySource, receivables } = await getReportsData();
  const receivableCents = receivables.reduce((sum, invoice) => sum + invoice.feeAmountCents - invoice.amountPaidCents, 0);
  const openClaims = claimsByStatus.filter((item) => !["CLOSED", "SETTLED"].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0);

  return (
    <>
      <PageHeader title="Reports" description="Simple office snapshots for open claims, overdue tasks, deadlines, lead sources, and outstanding receivables." />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Open claims" value={openClaims} detail="Not closed or settled" />
        <StatCard label="Overdue tasks" value={overdueTasks.length} detail="Open and past due" />
        <StatCard label="Upcoming deadlines" value={upcomingDeadlines.length} detail="Next 30 days" />
        <StatCard label="Receivables" value={formatMoney(receivableCents)} detail="Invoices still open" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Claims by status">
          <div className="grid gap-3">
            {claimsByStatus.map((item) => (
              <Card key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={item.status === "WAITING_ON_CARRIER" ? "amber" : item.status === "SETTLED" ? "green" : "slate"}>{labelFromEnum(item.status)}</Badge>
                </div>
                <p className="text-lg font-semibold text-slate-950">{item._count._all}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Leads by source">
          <div className="grid gap-3">
            {leadsBySource.map((item) => (
              <Card key={item.source} className="flex items-center justify-between">
                <p className="font-medium text-slate-950">{item.source}</p>
                <p className="text-lg font-semibold text-slate-950">{item._count._all}</p>
              </Card>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Overdue tasks">
          {overdueTasks.length === 0 ? (
            <EmptyState title="No overdue tasks" message="There are no open tasks past due." />
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
            <EmptyState title="No upcoming deadlines" message="No open claim deadlines are due in the next 30 days." />
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

      <Section title="Outstanding receivables">
        {receivables.length === 0 ? (
          <EmptyState title="No outstanding receivables" message="No sent, partially paid, or overdue invoices are open." />
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
    </>
  );
}
