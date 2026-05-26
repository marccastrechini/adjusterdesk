import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createDocument } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { documentCategoryOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

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

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} documents`} description="Track policy records, contracts, photos, estimates, carrier correspondence, settlement documents, and invoices." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section title="Claim documents and photos">
          {claim.documents.length === 0 ? (
            <EmptyState title="No documents yet" message="Upload a file or add a document record for this claim." />
          ) : (
            <div className="grid gap-3">
              {claim.documents.map((document) => (
                <Card key={document.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{document.title}</p>
                        <Badge tone={document.requestedFromClient ? "amber" : "slate"}>{labelFromEnum(document.category)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {document.fileName ?? (document.requestedFromClient ? "No file attached yet" : "No file attached")} · {document.uploadedByUser?.name ?? "Office"} · {formatDate(document.receivedAt ?? document.createdAt)}
                      </p>
                      {document.filePath ? <p className="mt-1 break-all text-xs text-slate-500">Local file saved for development</p> : null}
                      {document.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{document.notes}</p> : null}
                    </div>
                    {document.requestedFromClient ? <Badge tone="amber">Requested from client</Badge> : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add document</h2>
          <p className="text-sm leading-6 text-slate-600">Upload a local file when you have it, or mark it requested from client to track missing photos, policy pages, or invoices.</p>
          <form action={createDocument} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Title" hint="Use a name the office and client will recognize."><input name="title" className={inputClassName} placeholder="Policy declarations, kitchen photos..." /></Field>
            <Field label="Category" hint="Choose the closest type of record.">
              <select name="category" defaultValue="OTHER" className={selectClassName}>
                {documentCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="File" hint="Optional for a request. Attach the file when it is already available."><input name="file" type="file" className={inputClassName} /></Field>
            <Field label="Notes" hint="For requests, say exactly what the client needs to send."><textarea name="notes" className={textareaClassName} /></Field>
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" name="requestedFromClient" className="h-4 w-4 rounded border-slate-300" />
                Requested from client
              </label>
              <p className="text-xs leading-5 text-slate-500">Use this for missing photos, policy pages, receipts, or forms the office is waiting on.</p>
            </div>
            <SubmitButton>Save document or request</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
