import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createDocumentWithState } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { documentCategoryOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";
import { storedUploadExists } from "@/lib/storage";
import { documentRequestTemplates } from "@/lib/templates";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusFilterOptions = [
  ["ALL", "All"],
  ["REQUESTED", "Requested from client"],
  ["RECEIVED", "Received / uploaded"],
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClaimDocumentsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/documents`;
  const q = firstValue(query.q)?.trim() ?? "";
  const normalizedQuery = q.toLowerCase();
  const category = firstValue(query.category)?.trim() ?? "ALL";
  const status = firstValue(query.status)?.trim() ?? "ALL";
  const hasFilters = Boolean(q) || category !== "ALL" || status !== "ALL";

  const documentsWithStorage = await Promise.all(
    claim.documents.map(async (document) => ({
      document,
      hasStoredFile: await storedUploadExists(document.filePath),
    })),
  );

  const filteredDocuments = documentsWithStorage.filter(({ document }) => {
    const categoryLabel = labelFromEnum(document.category);
    const searchableValues = [document.title, document.fileName ?? "", document.notes ?? "", categoryLabel];
    const matchesQuery =
      q.length === 0 ||
      searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery));

    const matchesCategory = category === "ALL" || document.category === category;
    const matchesStatus =
      status === "ALL" || (status === "REQUESTED" ? document.requestedFromClient : !document.requestedFromClient);

    return matchesQuery && matchesCategory && matchesStatus;
  });

  const requestedDocuments = filteredDocuments.filter(({ document }) => document.requestedFromClient);
  const receivedDocuments = filteredDocuments.filter(({ document }) => !document.requestedFromClient);
  const noDocumentsYet = claim.documents.length === 0;
  const noFilteredResults = !noDocumentsYet && filteredDocuments.length === 0;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} documents`} description="Track policy records, contracts, photos, estimates, carrier correspondence, settlement documents, and invoices." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-6">
          <Card>
            <p className="mb-3 text-sm leading-6 text-slate-600">
              Claim file for {fullName(claim.contact)}{claim.claimNumber ? ` (Claim #${claim.claimNumber})` : ""}. {claim.lossType} at {propertyAddress(claim.property)}.
            </p>
            <form method="get" className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] md:items-end">
              <Field label="Search documents" hint="Search title, file name, notes, or category.">
                <input name="q" defaultValue={q} className={inputClassName} placeholder="Search documents..." />
              </Field>
              <Field label="Category" hint="Filter by document category.">
                <select name="category" defaultValue={category} className={selectClassName}>
                  <option value="ALL">All categories</option>
                  {documentCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Status" hint="Show requested or received documents.">
                <select name="status" defaultValue={status} className={selectClassName}>
                  {statusFilterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <div className="flex items-center gap-3 pb-1">
                <SubmitButton variant="secondary">Apply filters</SubmitButton>
                {hasFilters ? <ButtonLink href={returnPath} variant="secondary">Clear filters</ButtonLink> : null}
              </div>
            </form>
          </Card>

          {noDocumentsYet ? (
            <EmptyState title="No documents in this claim file yet" message="Upload a file or add a document request so the office can track what is missing." />
          ) : null}

          {noFilteredResults ? (
            <Card className="grid gap-3">
              <p className="font-medium text-slate-950">No documents match these filters.</p>
              {hasFilters ? <div><ButtonLink href={returnPath} variant="secondary">Clear filters</ButtonLink></div> : null}
            </Card>
          ) : null}

          {!noDocumentsYet && !noFilteredResults ? (
            <>
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
              <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredDocuments.length} total documents</p>
              <p className="mt-1 text-sm text-slate-600">Includes requests, uploads, and office records.</p>
            </div>
          </Card>

          <Section title="Requested from client" description="These are the items the office is still waiting on from the client.">
            {requestedDocuments.length === 0 ? (
              <EmptyState title="No client requests yet" message="Use the form on the right to request photos, policy pages, receipts, or other claim files." />
            ) : (
              <div className="grid gap-3">
                {requestedDocuments.map(({ document }) => (
                  <Card key={document.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{document.title}</p>
                          <Badge tone="slate">{labelFromEnum(document.category)}</Badge>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
                          <p>Claim file: {fullName(claim.contact)}{claim.claimNumber ? ` (Claim #${claim.claimNumber})` : ""}</p>
                          <p>Property: {propertyAddress(claim.property)}</p>
                          <p>Requested by: {document.uploadedByUser?.name ?? "Office"}</p>
                          <p>Requested {formatDate(document.createdAt)}</p>
                          <p>{document.notes ?? "No notes added"}</p>
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
                {receivedDocuments.map(({ document, hasStoredFile }) => {
                  const isReceived = Boolean(document.receivedAt || document.filePath);
                  const hasFileRecord = Boolean(document.filePath);
                  const fileIsMissing = hasFileRecord && !hasStoredFile;
                  const showDownload = hasFileRecord && hasStoredFile;

                  return (
                    <Card key={document.id}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{document.title}</p>
                            <Badge tone="slate">{labelFromEnum(document.category)}</Badge>
                            {isReceived ? <Badge tone="green">Received</Badge> : null}
                            {fileIsMissing ? <Badge tone="red">Local file missing</Badge> : null}
                          </div>
                          <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
                            <p>Claim file: {fullName(claim.contact)}{claim.claimNumber ? ` (Claim #${claim.claimNumber})` : ""}</p>
                            <p>Property: {propertyAddress(claim.property)}</p>
                            <p>Added by: {document.uploadedByUser?.name ?? "Office"}</p>
                            {document.fileName ? <p>File name: {document.fileName}</p> : null}
                            <p>Uploaded {formatDate(document.receivedAt ?? document.createdAt)}</p>
                            <p>{document.notes ?? "No notes added"}</p>
                          </div>
                          {showDownload ? (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <ButtonLink href={`/api/documents/${document.id}/download`} variant="secondary">Open or download file</ButtonLink>
                              <p className="text-xs leading-5 text-slate-500">File is available in local storage.</p>
                            </div>
                          ) : null}
                          {fileIsMissing ? (
                            <p className="mt-3 text-xs leading-5 text-rose-700">
                              This record points to a local file that is not on disk right now. Re-upload the file if you need it in this claim.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Section>
            </>
          ) : null}
        </div>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add document</h2>
          <p className="text-sm leading-6 text-slate-600">Start from a request template or write your own so the office knows whether this file is missing or already uploaded.</p>
          <ActionForm action={createDocumentWithState} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Start from a template" hint="Used when requesting claim documents. Or write your own request below.">
              <select name="documentTemplateKey" defaultValue="" className={selectClassName}>
                <option value="">Or write your own</option>
                {documentRequestTemplates.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
              </select>
            </Field>
            <Field label="Or write your own" hint="Use a name the office and client will recognize."><input name="title" className={inputClassName} placeholder="Policy declarations, kitchen photos..." /><FieldError name="title" /></Field>
            <Field label="Category" hint="Choose the closest type of record.">
              <select name="category" defaultValue="OTHER" className={selectClassName}>
                {documentCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="File" hint="Optional for a request. Attach the file when it is already available (up to 25 MB)."><input name="file" type="file" className={inputClassName} /><FieldError name="file" /></Field>
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
