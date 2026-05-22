import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { toggleTask } from "@/lib/actions";
import { formatDate, formatMoney, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getTodayData } from "@/lib/queries";
import { Badge, Card, EmptyState, PageHeader, Section, StatCard, SubmitButton } from "@/components/ui";

function taskHref(task: { claim?: { id: string } | null; lead?: { id: string } | null }) {
  if (task.claim) return `/claims/${task.claim.id}/tasks`;
  if (task.lead) return `/leads/${task.lead.id}`;
  return "/today";
}

function TaskList({ tasks, empty }: { tasks: Awaited<ReturnType<typeof getTodayData>>["overdueTasks"]; empty: string }) {
  if (tasks.length === 0) return <EmptyState title="No tasks here" message={empty} />;

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <Card key={task.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={taskHref(task)} className="font-medium text-slate-950 hover:text-teal-800">
                {task.title}
              </Link>
              <Badge tone={task.priority === "HIGH" ? "red" : "slate"}>{labelFromEnum(task.priority)}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {task.claim ? fullName(task.claim.contact) : task.lead ? fullName(task.lead.contact) : "General"} · Due {formatDate(task.dueDate)}
              {task.assignedUser ? ` · ${task.assignedUser.name}` : ""}
            </p>
          </div>
          <form action={toggleTask.bind(null, task.id, "/today")}>
            <SubmitButton variant="secondary">Complete</SubmitButton>
          </form>
        </Card>
      ))}
    </div>
  );
}

export default async function TodayPage() {
  const data = await getTodayData();
  const openReceivableCents = data.unpaidInvoices.reduce((sum, invoice) => sum + invoice.feeAmountCents - invoice.amountPaidCents, 0);

  return (
    <>
      <PageHeader
        title="Today"
        description="The office work that needs attention now: follow-ups, deadlines, carrier waiting, receivables, and recent claim movement."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overdue tasks" value={data.overdueTasks.length} detail="Open items past their due date" />
        <StatCard label="Due today" value={data.dueTodayTasks.length} detail="Calls, reminders, and follow-ups" />
        <StatCard label="Waiting on carrier" value={data.waitingOnCarrierClaims.length} detail="Claims needing carrier response" />
        <StatCard label="Open receivables" value={formatMoney(openReceivableCents)} detail="Sent or overdue invoices" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Overdue tasks" description="Handle these first so follow-ups do not slip.">
          <TaskList tasks={data.overdueTasks} empty="Nothing is overdue. The day is starting clean." />
        </Section>

        <Section title="Due today" description="Calls, texts, document requests, and office reminders due today.">
          <TaskList tasks={data.dueTodayTasks} empty="No tasks are due today." />
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Upcoming deadlines" description="Claim deadlines coming up in the next 30 days.">
          {data.upcomingDeadlines.length === 0 ? (
            <EmptyState title="No upcoming deadlines" message="No open claim deadlines are due in the next 30 days." />
          ) : (
            <div className="grid gap-3">
              {data.upcomingDeadlines.map((claim) => (
                <Card key={claim.id}>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                    <div>
                      <Link href={`/claims/${claim.id}`} className="font-medium text-slate-950 hover:text-teal-800">
                        {fullName(claim.contact)} · {claim.lossType}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">Deadline {formatDate(claim.deadlineDate)} · {propertyAddress(claim.property)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Waiting on carrier" description="Open claims currently waiting on a carrier response.">
          {data.waitingOnCarrierClaims.length === 0 ? (
            <EmptyState title="No carrier follow-ups" message="No claims are marked as waiting on carrier." />
          ) : (
            <div className="grid gap-3">
              {data.waitingOnCarrierClaims.map((claim) => (
                <Card key={claim.id}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                    <div>
                      <Link href={`/claims/${claim.id}`} className="font-medium text-slate-950 hover:text-teal-800">
                        {fullName(claim.contact)} · {claim.carrier?.name ?? "Carrier to confirm"}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">Assigned to {claim.assignedUser?.name ?? "Unassigned"} · Updated {formatDate(claim.updatedAt)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Unpaid invoices" description="Receivables that still need collection.">
          {data.unpaidInvoices.length === 0 ? (
            <EmptyState title="No unpaid receivables" message="Every sent invoice is paid or written off." />
          ) : (
            <div className="grid gap-3">
              {data.unpaidInvoices.map((invoice) => (
                <Card key={invoice.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link href={`/claims/${invoice.claim.id}/money`} className="font-medium text-slate-950 hover:text-teal-800">
                        {invoice.invoiceNumber} · {fullName(invoice.claim.contact)}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">Due {formatDate(invoice.dueAt)} · {labelFromEnum(invoice.status)}</p>
                    </div>
                    <p className="text-lg font-semibold text-slate-950">{formatMoney(invoice.feeAmountCents - invoice.amountPaidCents)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recently updated claims" description="Latest claim activity across the office.">
          <div className="grid gap-3">
            {data.recentClaims.map((claim) => (
              <Card key={claim.id}>
                <div className="flex items-start gap-3">
                  {claim.status === "SETTLED" ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <FileText className="mt-0.5 h-4 w-4 text-teal-700" />}
                  <div>
                    <Link href={`/claims/${claim.id}`} className="font-medium text-slate-950 hover:text-teal-800">
                      {fullName(claim.contact)} · {labelFromEnum(claim.status)}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{claim.lossType} · Updated {formatDate(claim.updatedAt)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
