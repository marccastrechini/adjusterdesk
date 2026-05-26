import type { Activity, Carrier, Claim, ClientStatusLink, Contact, Document as ClaimDocument, Firm, Property, Task, User } from "@/generated/prisma/client";
import { Badge, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";

type StatusClaim = Claim & {
  contact: Contact;
  property: Property;
  carrier: Carrier | null;
  assignedUser?: User | null;
  tasks: Task[];
  documents: ClaimDocument[];
  activities: (Activity & { user?: User | null })[];
};

function statusTone(status: string) {
  if (status === "SETTLED" || status === "CLOSED") return "green";
  if (status === "WAITING_ON_CARRIER" || status === "WAITING_ON_CLIENT") return "amber";
  return "teal";
}

export function ClientStatusView({
  firm,
  claim,
  statusLink,
  className,
}: {
  firm: Pick<Firm, "name" | "phone" | "email">;
  claim: StatusClaim;
  statusLink?: Pick<ClientStatusLink, "lastViewedAt"> | null;
  className?: string;
}) {
  const latestActivity = claim.activities[0];
  const recentActivities = claim.activities.slice(0, 3);
  const requestedDocuments = claim.documents.filter((document) => document.requestedFromClient);
  const openTasks = claim.tasks.filter((task) => task.status === "OPEN");
  const nextTask = openTasks[0];

  return (
    <div className={cn("grid gap-6", className)}>
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-teal-800">{firm.name}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{fullName(claim.contact)} claim status</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">{claim.lossType} · {propertyAddress(claim.property)}</p>
          </div>
          <Badge tone={statusTone(claim.status)}>{labelFromEnum(claim.status)}</Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6 content-start">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Current status</h2>
                <p className="mt-1 text-sm text-slate-600">Last office update {formatDateTime(latestActivity?.occurredAt ?? claim.updatedAt)}</p>
              </div>
              <Badge tone={statusTone(claim.status)}>{labelFromEnum(claim.status)}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {claim.publicSummary ?? "The office is tracking this claim and will update the next step as work progresses."}
            </p>
            {claim.nextStep ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm leading-6 text-teal-900">Next step: {claim.nextStep}</p> : null}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Recent updates</h2>
            {recentActivities.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">No updates have been posted yet.</p>
            ) : (
              <div className="mt-4 grid gap-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-teal-700 pl-3">
                    <p className="font-medium text-slate-950">{activity.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatDateTime(activity.occurredAt)} · {labelFromEnum(activity.type)}</p>
                    {activity.body ? <p className="mt-2 text-sm leading-6 text-slate-700">{activity.body}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="grid gap-6 content-start">
          <Card>
            <h2 className="text-base font-semibold text-slate-950">Requested documents</h2>
            {requestedDocuments.length === 0 ? (
              <EmptyState title="No client document requests are open right now" message="The office is not waiting on any client documents at the moment." />
            ) : (
              <div className="mt-4 grid gap-3">
                {requestedDocuments.map((document) => (
                  <div key={document.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-amber-950">{document.title}</p>
                      <Badge tone="amber">{labelFromEnum(document.category)}</Badge>
                    </div>
                    {document.notes ? <p className="mt-2 text-sm leading-6 text-amber-900">{document.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Claim details</h2>
            <dl className="mt-4 grid gap-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Property</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-950">{propertyAddress(claim.property)}</dd>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Carrier</dt>
                  <dd className="mt-1 text-sm text-slate-950">{claim.carrier?.name ?? "Carrier to confirm"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Claim number</dt>
                  <dd className="mt-1 text-sm text-slate-950">{claim.claimNumber ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Date of loss</dt>
                  <dd className="mt-1 text-sm text-slate-950">{formatDate(claim.dateOfLoss)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Inspection</dt>
                  <dd className="mt-1 text-sm text-slate-950">{formatDate(claim.inspectionDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Deadline</dt>
                  <dd className="mt-1 text-sm text-slate-950">{formatDate(claim.deadlineDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Next follow-up</dt>
                  <dd className="mt-1 text-sm text-slate-950">{nextTask ? `${nextTask.title} · ${formatDate(nextTask.dueDate)}` : "Not scheduled"}</dd>
                </div>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Office contact</h2>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Adjuster</dt>
                <dd className="mt-1 text-sm text-slate-950">{claim.assignedUser?.name ?? "Office team"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Office</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-950">
                  {firm.phone ?? "Phone not set"}
                  <br />
                  {firm.email ?? "Email not set"}
                </dd>
              </div>
              {statusLink?.lastViewedAt ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Last viewed</dt>
                  <dd className="mt-1 text-sm text-slate-950">{formatDateTime(statusLink.lastViewedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}