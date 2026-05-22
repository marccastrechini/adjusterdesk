import { FileUp } from "lucide-react";
import { uploadStatusDocument } from "@/lib/actions";
import { formatDate, formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getStatusPage } from "@/lib/queries";
import { Badge, Card, EmptyState, Field, inputClassName, SubmitButton } from "@/components/ui";

type PageProps = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: PageProps) {
  const { token } = await params;
  const statusLink = await getStatusPage(token);
  const claim = statusLink.claim;
  const latestActivity = claim.activities[0];
  const requestedDocuments = claim.documents.filter((document) => document.requestedFromClient);
  const latestInvoice = claim.invoices[0];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-teal-800">{statusLink.firm.name}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{fullName(claim.contact)} claim status</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">{claim.lossType} · {propertyAddress(claim.property)}</p>
            </div>
            <Badge tone={claim.status === "SETTLED" ? "green" : claim.status === "WAITING_ON_CARRIER" ? "amber" : "teal"}>{labelFromEnum(claim.status)}</Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-6">
            <Card>
              <h2 className="text-base font-semibold text-slate-950">Current status</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{claim.publicSummary ?? "The office is tracking this claim and will update the next step as work progresses."}</p>
              {claim.nextStep ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm leading-6 text-teal-900">Next step: {claim.nextStep}</p> : null}
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Carrier</dt>
                  <dd className="mt-1 text-sm text-slate-950">{claim.carrier?.name ?? "Carrier to confirm"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Claim number</dt>
                  <dd className="mt-1 text-sm text-slate-950">{claim.claimNumber ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Date of loss</dt>
                  <dd className="mt-1 text-sm text-slate-950">{formatDate(claim.dateOfLoss)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Last office update</dt>
                  <dd className="mt-1 text-sm text-slate-950">{formatDateTime(latestActivity?.occurredAt ?? claim.updatedAt)}</dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-slate-950">Recent updates</h2>
              {claim.activities.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No updates have been posted yet.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {claim.activities.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-teal-700 pl-3">
                      <p className="font-medium text-slate-950">{activity.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{labelFromEnum(activity.type)} · {formatDateTime(activity.occurredAt)}</p>
                      {activity.body ? <p className="mt-2 text-sm leading-6 text-slate-700">{activity.body}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <aside className="grid gap-6 content-start">
            <Card>
              <h2 className="text-base font-semibold text-slate-950">Requested documents</h2>
              {requestedDocuments.length === 0 ? (
                <EmptyState title="No requested documents" message="The office has not requested any documents right now." />
              ) : (
                <div className="mt-4 grid gap-3">
                  {requestedDocuments.map((document) => (
                    <div key={document.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                      <p className="font-medium text-amber-950">{document.title}</p>
                      {document.notes ? <p className="mt-1 text-sm leading-6 text-amber-900">{document.notes}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-slate-950">Upload a document</h2>
              <form action={uploadStatusDocument.bind(null, token)} className="mt-4 grid gap-3">
                <Field label="Document name"><input name="title" className={inputClassName} placeholder="Ceiling photos, receipt, letter..." /></Field>
                <Field label="File"><input name="file" type="file" required className={inputClassName} /></Field>
                <SubmitButton><FileUp className="mr-2 h-4 w-4" aria-hidden="true" /> Upload</SubmitButton>
              </form>
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-slate-950">Invoice status</h2>
              {latestInvoice ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{latestInvoice.invoiceNumber}</p>
                    <Badge tone={latestInvoice.status === "PAID" ? "green" : "amber"}>{labelFromEnum(latestInvoice.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Due {formatDate(latestInvoice.dueAt)}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No invoice is visible for this claim.</p>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
