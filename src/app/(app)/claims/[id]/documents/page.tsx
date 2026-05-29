import { DocumentRequestStatus } from "@/generated/prisma/client";
import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createDocumentWithState, markDocumentRequestStatus } from "@/lib/actions";
import { resolveDocumentRequestStatus } from "@/lib/document-requests";
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
  ["NOT_NEEDED", "Not needed"],
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
  const action = firstValue(query.action);
  const selectedAction = action === "request-document" || action === "add-document" ? action : undefined;
  const requestedDocumentId = firstValue(query.requestedDocumentId)?.trim() ?? "";
  const requestedDocument = claim.documents.find((document) => document.id === requestedDocumentId);
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
    const resolvedStatus = resolveDocumentRequestStatus(document);
    const matchesStatus =
      status === "ALL" ||
      (status === "REQUESTED" && resolvedStatus === DocumentRequestStatus.REQUESTED) ||
      (status === "RECEIVED" && resolvedStatus === DocumentRequestStatus.RECEIVED) ||
      (status === "NOT_NEEDED" && resolvedStatus === DocumentRequestStatus.NOT_NEEDED);

    return matchesQuery && matchesCategory && matchesStatus;
  });

  const requestedDocuments = filteredDocuments.filter(({ document }) => resolveDocumentRequestStatus(document) === DocumentRequestStatus.REQUESTED);
  const notNeededDocuments = filteredDocuments.filter(({ document }) => resolveDocumentRequestStatus(document) === DocumentRequestStatus.NOT_NEEDED);
  const receivedDocuments = filteredDocuments.filter(({ document }) => resolveDocumentRequestStatus(document) === DocumentRequestStatus.RECEIVED || resolveDocumentRequestStatus(document) === null);
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
            <EmptyState
              title="No documents in this claim file yet"
              message="Upload a file or add a document request so the office can track what is missing."
              actions={
                <>
                  <ButtonLink href={`${returnPath}?action=request-document`}>Request document</ButtonLink>
                  <ButtonLink href={`${returnPath}?action=add-document`} variant="secondary">Upload or record document</ButtonLink>
                </>
              }
            />
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
              <EmptyState
                title="No client requests yet"
                message="Request photos, policy pages, receipts, carrier letters, or other claim files when the office is waiting on the client."
                actions={<ButtonLink href={`${returnPath}?action=request-document`} variant="secondary">Request document</ButtonLink>}
              />
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
                          <p>{document.clientVisibleNote ?? "No client note added"}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <form action={markDocumentRequestStatus.bind(null, claim.id, document.id, DocumentRequestStatus.RECEIVED, returnPath)}>
                            <SubmitButton variant="secondary">Mark received</SubmitButton>
                          </form>
                          <form action={markDocumentRequestStatus.bind(null, claim.id, document.id, DocumentRequestStatus.NOT_NEEDED, returnPath)}>
                            <SubmitButton variant="secondary">Mark not needed</SubmitButton>
                          </form>
                          <ButtonLink href={`${returnPath}?action=add-document&requestedDocumentId=${document.id}`} variant="secondary">Upload and mark received</ButtonLink>
                        </div>
                      </div>
                      <Badge tone="amber">Waiting on client</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {notNeededDocuments.length > 0 ? (
            <Section title="Not needed" description="These requests were closed because the document is not needed for this claim.">
              <div className="grid gap-3">
                {notNeededDocuments.map(({ document }) => (
                  <Card key={document.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{document.title}</p>
                          <Badge tone="slate">{labelFromEnum(document.category)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{document.clientVisibleNote ?? "No client note added"}</p>
                      </div>
                      <Badge tone="slate">Not needed</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          ) : null}

          <Section title="Received / uploaded" description="These documents are already in the office file.">
            {receivedDocuments.length === 0 ? (
              <EmptyState
                title="No received documents yet"
                message="Uploaded files and office records will appear here after the office saves them to the claim."
                actions={<ButtonLink href={`${returnPath}?action=add-document`} variant="secondary">Upload or record document</ButtonLink>}
              />
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
                            {document.clientProvided ? <Badge tone="teal">Client uploaded</Badge> : null}
                            {fileIsMissing ? <Badge tone="red">Local file missing</Badge> : null}
                          </div>
                          <div className="mt-3 grid gap-1 text-sm leading-6 text-slate-600">
                            <p>Claim file: {fullName(claim.contact)}{claim.claimNumber ? ` (Claim #${claim.claimNumber})` : ""}</p>
                            <p>Property: {propertyAddress(claim.property)}</p>
                            <p>Added by: {document.uploadedByUser?.name ?? "Office"}</p>
                            {document.fileName ? <p>File name: {document.fileName}</p> : null}
                            <p>Uploaded {formatDate(document.receivedAt ?? document.createdAt)}</p>
                            <p>{document.notes ?? "No internal notes added"}</p>
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

        <aside className="grid gap-6 content-start">
          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Document actions</h2>
            <p className="text-sm leading-6 text-slate-600">Choose one path: request a missing file from the client, or upload/record a file the office already has.</p>

            {!selectedAction ? (
              <div className="grid gap-4">
                <div>
                  <ButtonLink href={`${returnPath}?action=request-document`} variant="primary">Request document from client</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Track missing photos, policy pages, receipts, and forms you still need.</p>
                </div>
                <div>
                  <ButtonLink href={`${returnPath}?action=add-document`} variant="secondary">Upload or record document</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Attach a file now or record a document the office already has.</p>
                </div>
              </div>
            ) : null}

            {selectedAction === "request-document" ? (
              <ActionForm action={createDocumentWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="requestedFromClient" value="on" />
                <p className="text-sm leading-6 text-slate-600">Use this when the office is waiting on the client to send a document.</p>
                <Field label="Start from a template" hint="Used for common claim document requests. Or write your own request below.">
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
                <Field label="Client note (optional)" hint="This note is shown on the client status page."><textarea name="clientVisibleNote" className={textareaClassName} placeholder="Please upload clear photos of all damaged rooms." /></Field>
                <Field label="Office notes (optional)" hint="Internal office note. This does not show on the client status page."><textarea name="notes" className={textareaClassName} /></Field>
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Save document request</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to document actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}

            {selectedAction === "add-document" ? (
              <ActionForm action={createDocumentWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                {requestedDocument ? <input type="hidden" name="requestedDocumentId" value={requestedDocument.id} /> : null}
                <p className="text-sm leading-6 text-slate-600">Use this for files the office already has or records without an uploaded file yet.</p>
                {requestedDocument ? <p className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-900">Uploading for request: {requestedDocument.title}. Saving here marks the request received.</p> : null}
                <Field label="Document title" hint="Use a name the office will recognize later."><input name="title" defaultValue={requestedDocument?.title ?? ""} className={inputClassName} placeholder="Estimate packet, signed agreement..." /><FieldError name="title" /></Field>
                <Field label="Category" hint="Choose the closest type of record.">
                  <select name="category" defaultValue={requestedDocument?.category ?? "OTHER"} className={selectClassName}>
                    {documentCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="File" hint="Attach the file when available (up to 25 MB)."><input name="file" type="file" className={inputClassName} /><FieldError name="file" /></Field>
                <Field label="Client note (optional)" hint="This note can be shown on the client status page for this requested item."><textarea name="clientVisibleNote" defaultValue={requestedDocument?.clientVisibleNote ?? ""} className={textareaClassName} /></Field>
                <Field label="Notes" hint="Optional office notes about this record."><textarea name="notes" className={textareaClassName} /></Field>
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>{requestedDocument ? "Save and mark request received" : "Save uploaded or office document"}</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to document actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}
          </Card>
        </aside>
      </div>
    </>
  );
}
