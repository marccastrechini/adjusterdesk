import { ClaimTabs } from "@/components/claim-tabs";
import { ClientStatusView } from "@/components/client-status-view";
import { CopyLinkField } from "@/components/copy-link-field";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createClientStatusLink, pauseClientStatusLink, reactivateClientStatusLink, updateClaimClientStatusWithState } from "@/lib/actions";
import { formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { claimStatusOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";
import { clientStatusPath } from "@/lib/status-links";

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
                <p className="text-sm leading-6 text-slate-600">Send this link to the client when you want them to see a simple claim status page.</p>
                <CopyLinkField path={clientStatusPath(statusLink.token)} />
                {statusLink.isActive ? (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={clientStatusPath(statusLink.token)} variant="secondary">Open client view</ButtonLink>
                    <form action={pauseClientStatusLink.bind(null, claim.id, statusLink.id)}>
                      <SubmitButton variant="secondary">Pause client link</SubmitButton>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={clientStatusPath(statusLink.token)} variant="secondary">Open paused page</ButtonLink>
                    <form action={reactivateClientStatusLink.bind(null, claim.id, statusLink.id)}>
                      <SubmitButton>Reactivate client link</SubmitButton>
                    </form>
                  </div>
                )}
                <p className="text-xs leading-5 text-slate-500">Use the client view to confirm status, next step, requested documents, and office contact details.</p>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                <EmptyState title="No client status link yet" message="Create a link when the office is ready to share this simple claim update with the client." />
                <form action={createClientStatusLink.bind(null, claim.id)}>
                  <SubmitButton>Create client status link</SubmitButton>
                </form>
              </div>
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

          <Section title="Client status links" description="Manage every client status link for this claim. New links stay in history so you can pause and reactivate them later.">
            <div className="grid gap-3">
              <form action={createClientStatusLink.bind(null, claim.id)} className="flex flex-wrap items-center gap-2">
                <SubmitButton>Create new client status link</SubmitButton>
              </form>

              {claim.statusLinks.length === 0 ? (
                <EmptyState title="No status links yet" message="Create the first client status link when you are ready to share the claim update." />
              ) : (
                <div className="grid gap-3">
                  {claim.statusLinks.map((link) => (
                    <Card key={link.id} className="grid gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-950">{clientStatusPath(link.token)}</p>
                            <Badge tone={link.isActive ? "green" : "slate"}>{link.isActive ? "Active" : "Paused"}</Badge>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Created {formatDateTime(link.createdAt)}</p>
                          {link.lastViewedAt ? <p className="mt-1 text-xs leading-5 text-slate-500">Last viewed {formatDateTime(link.lastViewedAt)}</p> : null}
                        </div>
                      </div>

                      <CopyLinkField path={clientStatusPath(link.token)} />

                      <div className="flex flex-wrap gap-2">
                        {link.isActive ? <ButtonLink href={clientStatusPath(link.token)} variant="secondary">Open client view</ButtonLink> : null}
                        {link.isActive ? (
                          <form action={pauseClientStatusLink.bind(null, claim.id, link.id)}>
                            <SubmitButton variant="secondary">Pause link</SubmitButton>
                          </form>
                        ) : (
                          <form action={reactivateClientStatusLink.bind(null, claim.id, link.id)}>
                            <SubmitButton>Reactivate link</SubmitButton>
                          </form>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Section>

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