import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { toggleTask } from "@/lib/actions";
import { formatDate, formatMoney, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum, propertyAddress } from "@/lib/format";
import { getTodayData } from "@/lib/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section, StatCard, SubmitButton } from "@/components/ui";

type TodayData = Awaited<ReturnType<typeof getTodayData>>;

function taskHref(task: { claim?: { id: string } | null; lead?: { id: string } | null }) {
  if (task.claim) return `/claims/${task.claim.id}/tasks`;
  if (task.lead) return `/leads/${task.lead.id}`;
  return "/today";
}

function taskListHref(anchor: string) {
  return `/today#${anchor}`;
}

function SummaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block h-full rounded-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
      {children}
    </Link>
  );
}

function timingTone(task: { dueDate?: Date | null }) {
  if (!task.dueDate) return "slate" as const;
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) return "red" as const;
  if (due.getTime() === today.getTime()) return "amber" as const;
  return "teal" as const;
}

function timingLabel(task: { dueDate?: Date | null }) {
  if (!task.dueDate) return "No due date";
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) return "Overdue";
  if (due.getTime() === today.getTime()) return "Due today";
  return "Upcoming";
}

function timingReason(task: { dueDate?: Date | null }) {
  if (!task.dueDate) return "Showing here because it is still open.";
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) return `Showing here because it was due ${formatDate(task.dueDate)}.`;
  if (due.getTime() === today.getTime()) return "Showing here because it is due today.";
  return `Coming up on ${formatDate(task.dueDate)}.`;
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
              <Badge tone={timingTone(task)}>{timingLabel(task)}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {task.claim ? fullName(task.claim.contact) : task.lead ? fullName(task.lead.contact) : "General"} · Due {formatDate(task.dueDate)}
              {task.assignedUser ? ` · ${task.assignedUser.name}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-600">{timingReason(task)}</p>
            {task.notes ? <p className="mt-2 text-sm leading-6 text-slate-700">Next step: {task.notes}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={taskHref(task)} variant="secondary">Open</ButtonLink>
            <form action={toggleTask.bind(null, task.id, "/today")}>
              <SubmitButton variant="secondary">Complete</SubmitButton>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LeadFollowUpList({ leads }: { leads: TodayData["leadFollowUps"] }) {
  if (leads.length === 0) {
    return <EmptyState title="Nothing due right now" message="Every open lead has a later follow-up date right now." />;
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
              <p className="mt-1 text-sm text-slate-600">Showing here because the lead follow-up date is already due or coming up soon.</p>
              {lead.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{lead.notes}</p> : null}
            </div>
            <div className="grid gap-2 justify-items-start">
              <p className="text-sm text-slate-600">Assigned to {lead.assignedUser?.name ?? "Unassigned"}</p>
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLink href={`/leads/${lead.id}`} variant="secondary">Open lead</ButtonLink>
                  <ButtonLink href={`/leads/${lead.id}?action=task&taskTemplateKey=follow-up-with-lead&duePreset=TOMORROW`} variant="secondary">Add follow-up task</ButtonLink>
                <ButtonLink href={`/leads/${lead.id}?action=activity`} variant="secondary">Log note or call</ButtonLink>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RequestedDocumentList({ documents }: { documents: TodayData["requestedDocuments"] }) {
  if (documents.length === 0) {
    return <EmptyState title="Nothing missing right now" message="There are no open claim document requests waiting on clients." />;
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
              <div className="grid gap-2 justify-items-start sm:justify-items-end">
                <Badge>{labelFromEnum(document.category)}</Badge>
                <ButtonLink href={`/claims/${document.claim.id}/documents`} variant="secondary">Open documents</ButtonLink>
              </div>
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
  const waitingOnClientCount = data.waitingOnClientClaims.length;
  const waitingOnCarrierCount = data.waitingOnCarrierClaims.length;
  const overdueInvoiceCount = data.unpaidInvoices.filter((invoice) => invoice.status === "OVERDUE").length;
  const upcomingDeadlineCount = data.upcomingDeadlines.length;
  const startActions: Array<{ href: string; label: string; detail: string; variant: "primary" | "secondary" }> = [];

  if (data.leadFollowUpCount > 0) {
    startActions.push({
      href: "/leads?status=ALL&assignedUserId=ALL&followUp=TODAY",
      label: "Work lead follow-ups",
      detail: `${data.leadFollowUpCount} lead${data.leadFollowUpCount === 1 ? "" : "s"} due for a touch.`,
      variant: "primary",
    });
  }

  if (data.overdueTaskCount > 0) {
    startActions.push({
      href: taskListHref("overdue-tasks"),
      label: "Clear overdue tasks",
      detail: `${data.overdueTaskCount} overdue task${data.overdueTaskCount === 1 ? "" : "s"}.`,
      variant: startActions.length === 0 ? "primary" : "secondary",
    });
  }

  if (data.requestedDocumentCount > 0) {
    startActions.push({
      href: taskListHref("requested-documents"),
      label: "Follow up on requested documents",
      detail: `${data.requestedDocumentCount} document request${data.requestedDocumentCount === 1 ? "" : "s"} waiting on clients.`,
      variant: startActions.length === 0 ? "primary" : "secondary",
    });
  }

  if (openReceivableCents > 0) {
    startActions.push({
      href: "/money?bucket=UNPAID",
      label: "Work unpaid receivables",
      detail: `${formatMoney(openReceivableCents)} still open.`,
      variant: startActions.length === 0 ? "primary" : "secondary",
    });
  }

  return (
    <>
      <PageHeader
        title="Today"
        description="A plain-language office worklist for leads, claims, deadlines, missing documents, carrier follow-ups, and receivables."
        actions={<ButtonLink href="/start" variant="secondary">Start checklist</ButtonLink>}
      />

      <Card className="bg-slate-50">
        <p className="text-sm font-semibold text-slate-950">Work the office in this order</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Start with leads that need a touch and overdue tasks, then work open claim deadlines and missing client documents, and finish with carrier follow-ups and unpaid fee invoices.
        </p>
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-950">Start here</p>
          {startActions.length > 0 ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {startActions.map((action) => (
                <div key={action.label} className="grid gap-1.5">
                  <ButtonLink href={action.href} variant={action.variant}>{action.label}</ButtonLink>
                  <p className="text-xs text-slate-500">{action.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 grid gap-3">
              <p className="text-sm text-slate-600">No urgent items are currently due. Review claims or leads for planned follow-ups.</p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/start" variant="secondary">Open start checklist</ButtonLink>
                <ButtonLink href="/claims" variant="secondary">Review claims</ButtonLink>
                <ButtonLink href="/leads" variant="secondary">Review leads</ButtonLink>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-teal-800">
          <Link href="/leads" className="hover:text-teal-900">Open leads</Link>
          <Link href="/claims" className="hover:text-teal-900">Open claims</Link>
          <Link href="/money" className="hover:text-teal-900">Open receivables</Link>
          <Link href="/reports" className="hover:text-teal-900">Open reports</Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryLink href={taskListHref("overdue-tasks")}>
          <StatCard label="Overdue tasks" value={data.overdueTaskCount} detail="Work that needs attention first" />
        </SummaryLink>
        <SummaryLink href={taskListHref("due-today")}>
          <StatCard label="Due today" value={data.dueTodayTaskCount} detail="Tasks to finish before the day ends" />
        </SummaryLink>
        <SummaryLink href={taskListHref("upcoming-deadlines")}>
          <StatCard label="Upcoming deadlines" value={upcomingDeadlineCount} detail="Claims with dates coming up in the next 30 days" />
        </SummaryLink>
        <SummaryLink href="/leads?status=ALL&assignedUserId=ALL&followUp=TODAY">
          <StatCard label="Lead follow-ups due" value={data.leadFollowUpCount} detail="Open leads due for a touch" />
        </SummaryLink>
        <SummaryLink href="/claims?status=WAITING_ON_CLIENT&assignedUserId=ALL&carrierId=ALL">
          <StatCard label="Waiting on client" value={waitingOnClientCount} detail="Claims blocked on client response" />
        </SummaryLink>
        <SummaryLink href="/claims?status=WAITING_ON_CARRIER&assignedUserId=ALL&carrierId=ALL">
          <StatCard label="Waiting on carrier" value={waitingOnCarrierCount} detail="Claims pending carrier action" />
        </SummaryLink>
        <SummaryLink href={openReceivableCents > 0 ? "/money?bucket=UNPAID" : "/money"}>
          <StatCard label="Unpaid receivables" value={formatMoney(openReceivableCents)} detail={overdueInvoiceCount > 0 ? `${overdueInvoiceCount} overdue invoice${overdueInvoiceCount === 1 ? "" : "s"}` : "Sent, partially paid, or overdue invoices"} />
        </SummaryLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Lead follow-ups due" description="Shows open leads with a follow-up date that is due now or coming up in the next few days.">
          <div id="lead-followups">
            <LeadFollowUpList leads={data.leadFollowUps} />
          </div>
        </Section>

        <Section title="Overdue tasks" description="Shows open work that is already past the due date and should be handled first.">
          <div id="overdue-tasks">
            <TaskList tasks={data.overdueTasks} empty="Nothing overdue right now." />
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Due today" description="Shows open work due before the day ends so the next touch does not slip.">
          <div id="due-today">
            <TaskList tasks={data.dueTodayTasks} empty="Nothing is due today." />
          </div>
        </Section>

        <Section title="Upcoming deadlines" description="Shows active claims with deadline dates coming up in the next 30 days.">
          <div id="upcoming-deadlines">
          {data.upcomingDeadlines.length === 0 ? (
            <EmptyState title="No upcoming deadlines" message="Nothing is due in the next 30 days." />
          ) : (
            <div className="grid gap-3">
              {data.upcomingDeadlines.map((claim) => (
                <Card key={claim.id}>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <Link href={`/claims/${claim.id}`} className="font-medium text-slate-950 hover:text-teal-800">
                        {fullName(claim.contact)} · {claim.lossType}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>Deadline {formatDate(claim.deadlineDate)}</span>
                        <Badge tone="amber">Keep moving</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{propertyAddress(claim.property)}</p>
                      <p className="mt-1 text-sm text-slate-600">Next step: {claim.nextStep ?? "Review the file and set the next task."}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ButtonLink href={`/claims/${claim.id}`} variant="secondary">Open claim</ButtonLink>
                        <ButtonLink href={`/claims/${claim.id}/tasks`} variant="secondary">Open tasks</ButtonLink>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Requested documents from clients" description="Shows claim documents the office already requested from the client and is still waiting to receive.">
          <div id="requested-documents">
            <RequestedDocumentList documents={data.requestedDocuments} />
          </div>
        </Section>

        <Section title="Waiting on carrier" description="Shows open claims marked as waiting on carrier so the office can decide on the next follow-up.">
          {data.waitingOnCarrierClaims.length === 0 ? (
            <EmptyState title="Nothing waiting on carrier" message="No claims are marked as waiting on carrier right now." />
          ) : (
            <div className="grid gap-3">
              {data.waitingOnCarrierClaims.map((claim) => (
                <Card key={claim.id}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <Link href={`/claims/${claim.id}`} className="font-medium text-slate-950 hover:text-teal-800">
                        {fullName(claim.contact)} · {claim.carrier?.name ?? "Carrier to confirm"}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">Assigned to {claim.assignedUser?.name ?? "Unassigned"} · Updated {formatDate(claim.updatedAt)}</p>
                      <p className="mt-1 text-sm text-slate-600">Next step: {claim.nextStep ?? "Open the claim and set the next carrier follow-up."}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ButtonLink href={`/claims/${claim.id}`} variant="secondary">Open claim</ButtonLink>
                        <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=follow-up-with-carrier&duePreset=IN_3_DAYS`} variant="secondary">Add carrier follow-up task</ButtonLink>
                        <ButtonLink href={`/claims/${claim.id}/communications?action=log-communication`} variant="secondary">Log note or call</ButtonLink>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Outstanding receivables" description="Shows sent, partially paid, and overdue fee invoices that still have money left to collect.">
          <div id="receivables">
          {data.unpaidInvoices.length === 0 ? (
            <EmptyState title="Nothing unpaid" message="Every sent invoice is paid or written off." />
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
                      <p className="mt-1 text-sm text-slate-600">Showing here because this invoice still has an open balance.</p>
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          <ButtonLink href={`/claims/${invoice.claim.id}/money`} variant="secondary">Open money</ButtonLink>
                          <ButtonLink href={`/claims/${invoice.claim.id}/tasks?action=add-task&taskTemplateKey=follow-up-on-receivable&duePreset=IN_3_DAYS`} variant="secondary">Add receivable follow-up task</ButtonLink>
                        </div>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-slate-950">{formatMoney(invoiceAmountDue(invoice))}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </Section>

        <Section title="Coming up next" description="Open tasks due after today and within the next two weeks.">
          <TaskList tasks={data.upcomingTasks} empty="Nothing else is coming due in the next two weeks." />
        </Section>
      </div>
    </>
  );
}
