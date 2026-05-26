import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createDocumentWithState } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { documentCategoryOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";
import { documentRequestTemplates } from "@/lib/templates";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimDocumentsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/documents`;
  const requestedDocuments = claim.documents.filter((document) => document.requestedFromClient);
  const receivedDocuments = claim.documents.filter((document) => !document.requestedFromClient);

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} documents`} description="Track policy records, contracts, photos, estimates, carrier correspondence, settlement documents, and invoices." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-6">
          <Card className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Requested from client</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{requestedDocuments.length} requested</p>
              <p className="mt-1 text-sm text-slate-600">Waiting on the client to send these items.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Received / uploaded</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{receivedDocuments.length} received</p>
              <p className="mt-1 text-sm text-slate-600">Files already in the claim file.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Total documents</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{claim.documents.length} total documents</p>
              <p className="mt-1 text-sm text-slate-600">Includes requests, uploads, and office records.</p>
            </div>
          </Card>

          <Section title="Requested from client" description="These are the items the office is still waiting on from the client.">
            {requestedDocuments.length === 0 ? (
              <EmptyState title="No client requests yet" message="Use the form on the right to request photos, policy pages, receipts, or other claim files." />
            ) : (
              <div className="grid gap-3">
                {requestedDocuments.map((document) => (
                  <Card key={document.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{document.title}</p>
                          <Badge tone="slate">{labelFromEnum(document.category)}</Badge>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
                          <p>{document.notes ?? "No notes added"}</p>
                          <p>Requested {formatDate(document.createdAt)}</p>
                        </div>
                      </div>
                      <Badge tone="amber">Waiting on client</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Received / uploaded" description="These documents are already in the office file.">
            {receivedDocuments.length === 0 ? (
              <EmptyState title="No received documents yet" message="Uploaded files and office records will appear here." />
            ) : (
              <div className="grid gap-3">
                {receivedDocuments.map((document) => {
                  const isReceived = Boolean(document.receivedAt || document.filePath);

                  return (
                    <Card key={document.id}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{document.title}</p>
                            <Badge tone="slate">{labelFromEnum(document.category)}</Badge>
                            {isReceived ? <Badge tone="green">Received</Badge> : null}
                          </div>
                          <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
                            {document.fileName ? <p>File name: {document.fileName}</p> : null}
                            {document.receivedAt ? <p>Received {formatDate(document.receivedAt)}</p> : null}
                            <p>{document.notes ?? "No notes added"}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add document</h2>
          <p className="text-sm leading-6 text-slate-600">Upload a local file when you have it, or mark it requested from client to track missing photos, policy pages, or invoices.</p>
          <ActionForm action={createDocumentWithState} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Common request" hint="Optional client document request for routine claim files.">
              <select name="documentTemplateKey" defaultValue="" className={selectClassName}>
                <option value="">Custom document</option>
                {documentRequestTemplates.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
              </select>
            </Field>
            <Field label="Title" hint="Use a name the office and client will recognize."><input name="title" className={inputClassName} placeholder="Policy declarations, kitchen photos..." /><FieldError name="title" /></Field>
            <Field label="Category" hint="Choose the closest type of record.">
              <select name="category" defaultValue="OTHER" className={selectClassName}>
                {documentCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="File" hint="Optional for a request. Attach the file when it is already available."><input name="file" type="file" className={inputClassName} /></Field>
            <Field label="Notes" hint="For requests, say exactly what the client needs to send. Common requests add this when blank."><textarea name="notes" className={textareaClassName} /></Field>
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" name="requestedFromClient" className="h-4 w-4 rounded border-slate-300" />
                Requested from client
              </label>
              <p className="text-xs leading-5 text-slate-500">Use this for missing photos, policy pages, receipts, or forms the office is waiting on.</p>
            </div>
            <SubmitButton>Save document or request</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
