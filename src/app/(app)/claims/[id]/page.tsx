import Link from "next/link";
import { DocumentRequestStatus } from "@/generated/prisma/client";
import { AnalyticsOnLoad } from "@/components/analytics-on-load";
import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, DetailItem, EmptyState, PageHeader, Section } from "@/components/ui";
import { formatDate, formatMoney, fullName, invoiceAmountDue, invoiceDisplayStatus, labelFromEnum, propertyAddress } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { getClaim } from "@/lib/queries";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimOverviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const noticeKey = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const firstClaimFlag = Array.isArray(query.firstClaim) ? query.firstClaim[0] : query.firstClaim;
  const isFirstClaimCreated = noticeKey === "claim-created" && firstClaimFlag === "1";
  const openTasks = claim.tasks.filter((task) => task.status === "OPEN");
  const nextTask = openTasks[0];
  const requestedDocuments = claim.documents.filter((document) =>
    document.requestStatus === DocumentRequestStatus.REQUESTED || document.requestedFromClient,
  );
  const latestActivity = claim.activities[0];
  const latestInvoice = claim.invoices[0];
  const openInvoiceCents = claim.invoices.reduce((sum, invoice) => sum + invoiceAmountDue(invoice), 0);
  const statusLink = claim.statusLinks[0];

  return (
    <>
      {isFirstClaimCreated ? (
        <AnalyticsOnLoad
          eventName="first_claim_created"
          dedupeKey={`claim:${claim.id}:first-claim-created`}
          eventData={{ claimId: claim.id }}
        />
      ) : null}

      <PageHeader
        title={`${fullName(claim.contact)} claim`}
        description={`${claim.lossType} · ${propertyAddress(claim.property)}`}
        actions={<ButtonLink href="/claims" variant="secondary">Back to claims</ButtonLink>}
      />
      {notice ? <Card className="border-emerald-200 bg-emerald-50 text-emerald-900"><p className="font-semibold">{notice.title}</p><p className="mt-1 text-sm leading-6">{notice.message}</p></Card> : null}
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

          <Section title="What to work next" description="A quick claim map for the next office action before jumping into the tabs.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Link href={`/claims/${claim.id}/tasks`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40">
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Tasks</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{openTasks.length} open</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{nextTask ? `Next: ${nextTask.title}` : "No open follow-ups"}</p>
              </Link>
              <Link href={`/claims/${claim.id}/documents`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40">
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Documents</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{requestedDocuments.length} requested</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{requestedDocuments[0]?.title ?? `${claim.documents.length} saved to the claim`}</p>
              </Link>
              <Link href={`/claims/${claim.id}/communications`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40">
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Notes</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{latestActivity ? "Latest note" : "No notes yet"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{latestActivity ? `${latestActivity.subject} · ${formatDate(latestActivity.occurredAt)}` : "Log the next client or carrier touch"}</p>
              </Link>
              <Link href={`/claims/${claim.id}/money`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40">
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Money</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{formatMoney(openInvoiceCents)} due</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{latestInvoice ? `${latestInvoice.invoiceNumber}: ${invoiceDisplayStatus(latestInvoice)}` : "Create an invoice after settlement"}</p>
              </Link>
            </div>
          </Section>

          {claim.status !== "SETTLED" && claim.status !== "CLOSED" ? (
            <Section title="Suggested next steps" description="Use common follow-ups to keep active claims moving.">
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=request-policy-documents&duePreset=TODAY`} variant="secondary">Request policy documents</ButtonLink>
                <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=upload-photos&duePreset=TOMORROW`} variant="secondary">Upload photos</ButtonLink>
                <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=follow-up-with-carrier&duePreset=IN_3_DAYS`} variant="secondary">Follow up with carrier</ButtonLink>
                <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=update-client-status-link&duePreset=TODAY`} variant="secondary">Update client status</ButtonLink>
              </div>
            </Section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Open tasks" actions={<ButtonLink href={`/claims/${claim.id}/tasks`} variant="secondary">Manage tasks</ButtonLink>}>
              {openTasks.length === 0 ? (
                <EmptyState
                  title="No open tasks"
                  message="This claim has no open follow-ups. Add the next call, carrier follow-up, document request, or deadline reminder."
                  actions={<ButtonLink href={`/claims/${claim.id}/tasks?action=add-task`} variant="secondary">Add task</ButtonLink>}
                />
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
                <EmptyState
                  title="No documents"
                  message="Upload policy, photos, estimates, carrier correspondence, or add a client document request."
                  actions={<ButtonLink href={`/claims/${claim.id}/documents?action=request-document`} variant="secondary">Request document</ButtonLink>}
                />
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
                <DetailItem label="Calculated fee" value={formatMoney(latestInvoice.feeAmountCents)} />
                <DetailItem label="Payment received" value={latestInvoice.amountPaidCents > 0 ? formatMoney(latestInvoice.amountPaidCents) : "No payment yet"} />
                <DetailItem label="Status" value={invoiceDisplayStatus(latestInvoice)} />
                <DetailItem label="Amount due" value={formatMoney(invoiceAmountDue(latestInvoice))} />
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
                <p className="mt-2 text-sm text-slate-600">Preview the simple client-facing update before sharing it.</p>
                <Link href={`/claims/${claim.id}/client-status`} className="mt-3 inline-flex text-sm font-medium text-teal-800 hover:text-teal-900">Open client status</Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-600">Preview the client-facing update for this claim.</p>
                <Link href={`/claims/${claim.id}/client-status`} className="mt-3 inline-flex text-sm font-medium text-teal-800 hover:text-teal-900">Open client status</Link>
              </>
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
