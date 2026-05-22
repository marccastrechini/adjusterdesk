import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createDocument } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum } from "@/lib/format";
import { documentCategoryOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  const { claim } = await getClaim(id);
  const returnPath = `/claims/${claim.id}/documents`;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} documents`} description="Track policy records, contracts, photos, estimates, carrier correspondence, settlement documents, and invoices." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />

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
                        {document.fileName ?? "No file attached"} · {document.uploadedByUser?.name ?? "Office"} · {formatDate(document.receivedAt ?? document.createdAt)}
                      </p>
                      {document.filePath ? <p className="mt-1 break-all text-xs text-slate-500">Stored at {document.filePath}</p> : null}
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
          <form action={createDocument} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Title"><input name="title" className={inputClassName} placeholder="Policy declarations, kitchen photos..." /></Field>
            <Field label="Category">
              <select name="category" defaultValue="OTHER" className={selectClassName}>
                {documentCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="File"><input name="file" type="file" className={inputClassName} /></Field>
            <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="requestedFromClient" className="h-4 w-4 rounded border-slate-300" />
              Requested from client
            </label>
            <SubmitButton>Add document</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
