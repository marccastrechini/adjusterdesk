import Link from "next/link";
import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, DetailItem, EmptyState, PageHeader, Section } from "@/components/ui";
import { formatDate, formatMoney, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getClaim } from "@/lib/queries";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const { claim } = await getClaim(id);
  const openTasks = claim.tasks.filter((task) => task.status === "OPEN");
  const latestActivity = claim.activities[0];
  const latestInvoice = claim.invoices[0];
  const statusLink = claim.statusLinks[0];

  return (
    <>
      <PageHeader
        title={`${fullName(claim.contact)} claim`}
        description={`${claim.lossType} · ${propertyAddress(claim.property)}`}
        actions={<ButtonLink href="/claims" variant="secondary">Back to claims</ButtonLink>}
      />
      <ClaimTabs claimId={claim.id} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Claim overview</h2>
                <p className="mt-1 text-sm text-slate-600">Updated {formatDate(claim.updatedAt)} · Assigned to {claim.assignedUser?.name ?? "Unassigned"}</p>
              </div>
              <Badge tone={claim.status === "SETTLED" ? "green" : claim.status === "WAITING_ON_CARRIER" ? "amber" : "slate"}>{labelFromEnum(claim.status)}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailItem label="Client" value={`${claim.contact.email ?? "No email"} · ${claim.contact.phone ?? "No phone"}`} />
              <DetailItem label="Carrier" value={claim.carrier?.name ?? "Carrier to confirm"} />
              <DetailItem label="Claim number" value={claim.claimNumber ?? "Not set"} />
              <DetailItem label="Policy" value={claim.policy?.policyNumber ?? "Not set"} />
              <DetailItem label="Date of loss" value={formatDate(claim.dateOfLoss)} />
              <DetailItem label="Deadline" value={formatDate(claim.deadlineDate)} />
            </dl>
            {claim.nextStep ? <p className="mt-5 rounded-md bg-teal-50 p-3 text-sm leading-6 text-teal-900">Next step: {claim.nextStep}</p> : null}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Open tasks" actions={<ButtonLink href={`/claims/${claim.id}/tasks`} variant="secondary">Manage tasks</ButtonLink>}>
              {openTasks.length === 0 ? (
                <EmptyState title="No open tasks" message="This claim has no open follow-ups." />
              ) : (
                <div className="grid gap-3">
                  {openTasks.slice(0, 4).map((task) => (
                    <Card key={task.id}>
                      <p className="font-medium text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-600">Due {formatDate(task.dueDate)} · {task.assignedUser?.name ?? "Unassigned"}</p>
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Documents" actions={<ButtonLink href={`/claims/${claim.id}/documents`} variant="secondary">Manage documents</ButtonLink>}>
              {claim.documents.length === 0 ? (
                <EmptyState title="No documents" message="Upload policy, photos, estimates, and carrier correspondence." />
              ) : (
                <div className="grid gap-3">
                  {claim.documents.slice(0, 4).map((document) => (
                    <Card key={document.id}>
                      <p className="font-medium text-slate-950">{document.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{labelFromEnum(document.category)} · {formatDate(document.receivedAt ?? document.createdAt)}</p>
                    </Card>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>

        <aside className="grid gap-6 content-start">
          <Card>
            <h2 className="text-base font-semibold text-slate-950">Money snapshot</h2>
            {latestInvoice ? (
              <dl className="mt-4 grid gap-4">
                <DetailItem label="Latest invoice" value={latestInvoice.invoiceNumber} />
                <DetailItem label="Fee amount" value={formatMoney(latestInvoice.feeAmountCents)} />
                <DetailItem label="Status" value={labelFromEnum(latestInvoice.status)} />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No invoice has been created for this claim.</p>
            )}
            <Link href={`/claims/${claim.id}/money`} className="mt-4 inline-flex text-sm font-medium text-teal-800 hover:text-teal-900">Open money details</Link>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Client status page</h2>
            {statusLink ? (
              <>
                <p className="mt-2 text-sm text-slate-600">Share this simple status page with the client.</p>
                <Link href={`/status/${statusLink.token}`} className="mt-3 inline-flex text-sm font-medium text-teal-800 hover:text-teal-900">Open public status</Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No public status token has been created yet.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Latest communication</h2>
            {latestActivity ? (
              <div className="mt-3">
                <p className="font-medium text-slate-950">{latestActivity.subject}</p>
                <p className="mt-1 text-sm text-slate-600">{labelFromEnum(latestActivity.type)} · {formatDate(latestActivity.occurredAt)}</p>
                {latestActivity.body ? <p className="mt-3 text-sm leading-6 text-slate-700">{latestActivity.body}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No communications have been logged yet.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
