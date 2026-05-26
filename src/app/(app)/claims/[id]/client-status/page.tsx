import { ClaimTabs } from "@/components/claim-tabs";
import { ClientStatusView } from "@/components/client-status-view";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { updateClaimClientStatusWithState } from "@/lib/actions";
import { formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { claimStatusOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimClientStatusPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { firm, claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
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
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="grid gap-6 content-start">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-950">Share preview</h2>
              {statusLink ? <Badge tone={statusLink.isActive ? "green" : "slate"}>{statusLink.isActive ? "Active link" : "Inactive link"}</Badge> : null}
            </div>
            {statusLink ? (
              <div className="mt-3 grid gap-3">
                <p className="text-sm leading-6 text-slate-600">This is the current local client status link for the claim.</p>
                <p className="break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">/status/{statusLink.token}</p>
                {statusLink.isActive ? (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={`/status/${statusLink.token}`} variant="secondary">Open client view</ButtonLink>
                  </div>
                ) : null}
                <p className="text-xs leading-5 text-slate-500">Use the client view to confirm status, next step, requested documents, and office contact details.</p>
              </div>
            ) : (
              <EmptyState title="Share link coming soon" message="This claim can still use the preview below. Creating and managing client links can be added later." />
            )}
          </Card>

          <Card className="grid gap-4 content-start">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Update client status</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">These fields control what the client sees in the status page preview.</p>
            </div>
            <ActionForm action={updateClaimClientStatusWithState.bind(null, claim.id)} className="grid gap-3">
              <Field label="Client-facing summary" hint="A short plain-language update for the client. Leave blank to use the default preview wording.">
                <textarea name="publicSummary" defaultValue={claim.publicSummary ?? ""} maxLength={600} className={textareaClassName} />
                <FieldError name="publicSummary" />
              </Field>
              <Field label="Next step for the client" hint="One clear next action or expectation. Leave blank if there is no next step to show.">
                <textarea name="nextStep" defaultValue={claim.nextStep ?? ""} maxLength={280} className={textareaClassName} />
                <FieldError name="nextStep" />
              </Field>
              <Field label="Claim status" hint="This also updates the status badge in the client preview.">
                <select name="status" defaultValue={claim.status} className={selectClassName}>
                  {claimStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <FieldError name="status" />
              </Field>
              <SubmitButton>Save client status</SubmitButton>
            </ActionForm>
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