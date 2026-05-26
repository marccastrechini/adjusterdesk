import { ClaimTabs } from "@/components/claim-tabs";
import { ClientStatusView } from "@/components/client-status-view";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section } from "@/components/ui";
import { formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getClaim } from "@/lib/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClaimClientStatusPage({ params }: PageProps) {
  const { id } = await params;
  const { firm, claim } = await getClaim(id);
  const statusLink = claim.statusLinks[0];
  const requestedDocuments = claim.documents.filter((document) => document.requestedFromClient);
  const latestActivity = claim.activities[0];

  return (
    <>
      <PageHeader
        title={`${fullName(claim.contact)} client status`}
        description={`${claim.lossType} · ${propertyAddress(claim.property)}`}
        actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>}
      />
      <ClaimTabs claimId={claim.id} />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="grid gap-6 content-start">
          <Card>
            <h2 className="text-base font-semibold text-slate-950">Share preview</h2>
            {statusLink?.isActive ? (
              <div className="mt-3 grid gap-3">
                <p className="text-sm leading-6 text-slate-600">This is the current local client status link for the claim.</p>
                <p className="break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">/status/{statusLink.token}</p>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/status/${statusLink.token}`} variant="secondary">Open client view</ButtonLink>
                </div>
                <p className="text-xs leading-5 text-slate-500">Use the client view to confirm status, next step, requested documents, and office contact details.</p>
              </div>
            ) : (
              <EmptyState title="Share link coming soon" message="This claim can still use the preview below. Creating and managing client links can be added later." />
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Client-facing summary</h2>
            <dl className="mt-4 grid gap-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Status</dt>
                <dd className="mt-1"><Badge>{labelFromEnum(claim.status)}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Next step</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-950">{claim.nextStep ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Requested documents</dt>
                <dd className="mt-1 text-sm text-slate-950">{requestedDocuments.length} open</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Latest update</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-950">{latestActivity ? `${latestActivity.subject} · ${formatDateTime(latestActivity.occurredAt)}` : "No update posted yet"}</dd>
              </div>
            </dl>
          </Card>
        </aside>

        <Section title="Client view preview" description="A cleaner claim update page for clients, without internal money, task, or file-management screens.">
          <ClientStatusView firm={firm} claim={claim} statusLink={statusLink} />
        </Section>
      </div>
    </>
  );
}