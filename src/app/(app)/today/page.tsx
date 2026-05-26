import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { toggleTask } from "@/lib/actions";
import { formatDate, formatMoney, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum, propertyAddress } from "@/lib/format";
import { getTodayData } from "@/lib/queries";
import { Badge, Card, EmptyState, PageHeader, Section, StatCard, SubmitButton } from "@/components/ui";

type TodayData = Awaited<ReturnType<typeof getTodayData>>;

function taskHref(task: { claim?: { id: string } | null; lead?: { id: string } | null }) {
  if (task.claim) return `/claims/${task.claim.id}/tasks`;
  if (task.lead) return `/leads/${task.lead.id}`;
  return "/today";
}

function TaskList({ tasks, empty }: { tasks: TodayData["overdueTasks"]; empty: string }) {
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

function LeadFollowUpList({ leads }: { leads: TodayData["leadFollowUps"] }) {
  if (leads.length === 0) {
    return <EmptyState title="No lead follow-ups due" message="Every open lead has a later follow-up date right now." />;
  }

  return (
    <div className="grid gap-3">
      {leads.map((lead) => (
        <Card key={lead.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/leads/${lead.id}`} className="font-medium text-slate-950 hover:text-teal-800">
                  {fullName(lead.contact)}
                </Link>
                <Badge tone={lead.status === "NEW" ? "teal" : "slate"}>{labelFromEnum(lead.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{lead.lossType} · {propertyAddress(lead.property)}</p>
              <p className="mt-1 text-sm text-slate-600">
                Follow-up {formatDate(lead.followUpDate)} · {lead.source}
                {lead.referralSource ? ` · ${lead.referralSource}` : ""}
              </p>
              {lead.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{lead.notes}</p> : null}
            </div>
            <p className="text-sm text-slate-600">Assigned to {lead.assignedUser?.name ?? "Unassigned"}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RequestedDocumentList({ documents }: { documents: TodayData["requestedDocuments"] }) {
  if (documents.length === 0) {
    return <EmptyState title="No missing client documents" message="There are no open claim document requests waiting on clients." />;
  }

  return (
    <div className="grid gap-3">
      {documents.map((document) => {
        if (!document.claim) return null;

        return (
          <Card key={document.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/claims/${document.claim.id}/documents`} className="font-medium text-slate-950 hover:text-teal-800">
                    {document.title}
                  </Link>
                  <Badge tone="amber">Requested from client</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{fullName(document.claim.contact)} · Requested {formatDate(document.createdAt)}</p>
                <p className="mt-1 text-sm text-slate-600">Assigned to {document.claim.assignedUser?.name ?? "Unassigned"}</p>
                {document.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{document.notes}</p> : null}
              </div>
              <Badge>{labelFromEnum(document.category)}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default async function TodayPage() {
  const data = await getTodayData();
  const openReceivableCents = data.unpaidInvoices.reduce((sum, invoice) => sum + invoiceAmountDue(invoice), 0);
  const tasksDueNowCount = data.overdueTaskCount + data.dueTodayTaskCount;

  return (
    <>
      <PageHeader
        title="Today"
        description="A plain-language office worklist for leads, claims, deadlines, missing documents, carrier follow-ups, and receivables."
      />

      <Card className="bg-slate-50">
        <p className="text-sm font-semibold text-slate-950">Work the office in this order</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Start with leads that need a touch and overdue tasks, then work open claim deadlines and missing client documents, and finish with carrier follow-ups and unpaid fee invoices.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-teal-800">
          <Link href="/leads" className="hover:text-teal-900">Open leads</Link>
          <Link href="/claims" className="hover:text-teal-900">Open claims</Link>
          <Link href="/money" className="hover:text-teal-900">Open receivables</Link>
          <Link href="/reports" className="hover:text-teal-900">Open reports</Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Lead follow-ups" value={data.leadFollowUpCount} detail="Open leads due for a touch" />
        <StatCard label="Tasks due now" value={tasksDueNowCount} detail="Overdue or due today" />
        <StatCard label="Active claims" value={data.activeClaimCount} detail="Claims still being worked" />
        <StatCard label="Requested docs" value={data.requestedDocumentCount} detail="Items still needed from clients" />
        <StatCard label="Open receivables" value={formatMoney(openReceivableCents)} detail="Sent, partially paid, or overdue invoices" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Lead follow-ups" description="Open leads due for a call, text, or intake follow-up in the next few days.">
          <LeadFollowUpList leads={data.leadFollowUps} />
        </Section>

        <Section title="Overdue tasks" description="Handle these first so follow-ups do not slip.">
          <TaskList tasks={data.overdueTasks} empty="Nothing is overdue. The day is starting clean." />
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Due today" description="Calls, texts, document requests, and office reminders due today.">
          <TaskList tasks={data.dueTodayTasks} empty="No tasks are due today." />
        </Section>

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
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Requested documents from clients" description="Files or photos the office is still waiting on before the claim can move forward.">
          <RequestedDocumentList documents={data.requestedDocuments} />
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
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>Due {formatDate(invoice.dueAt)}</span>
                        <Badge tone={invoiceStatusTone(invoice)}>{invoiceDisplayStatus(invoice)}</Badge>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-slate-950">{formatMoney(invoiceAmountDue(invoice))}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Coming up next" description="Open tasks due after today and within the next two weeks.">
          <TaskList tasks={data.upcomingTasks} empty="Nothing else is coming due in the next two weeks." />
        </Section>
      </div>
    </>
  );
}
