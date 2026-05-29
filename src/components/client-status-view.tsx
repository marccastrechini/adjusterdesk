import type { ClientStatusLink, Firm } from "@/generated/prisma/client";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, SubmitButton, inputClassName, selectClassName } from "@/components/ui";
import { buildClientStatusViewModel, type ClientStatusClaim } from "@/lib/client-status";
import { uploadStatusDocumentWithState } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function ClientStatusView({
  firm,
  claim,
  statusLink,
  statusToken,
  allowClientUpload = false,
  className,
}: {
  firm: Pick<Firm, "name" | "phone" | "email">;
  claim: ClientStatusClaim;
  statusLink?: Pick<ClientStatusLink, "lastViewedAt"> | null;
  statusToken?: string;
  allowClientUpload?: boolean;
  className?: string;
}) {
  const status = buildClientStatusViewModel({ firm, claim, lastViewedAt: statusLink?.lastViewedAt });
  const openDocumentRequests = status.requestedDocuments.filter((document) => document.statusLabel === "Requested");

  return (
    <div className={cn("grid gap-6", className)}>
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-teal-800">{status.firm.name}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{status.heading}</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">{status.lossType} · {status.propertyAddress}</p>
          </div>
          <Badge tone={status.statusTone}>{status.statusLabel}</Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6 content-start">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Current status</h2>
                <p className="mt-1 text-sm text-slate-600">Last office update {status.lastUpdatedAt}</p>
              </div>
              <Badge tone={status.statusTone}>{status.statusLabel}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{status.lastUpdateText}</p>
            {status.nextStep ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm leading-6 text-teal-900">Next step: {status.nextStep}</p> : null}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Claim details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Property</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-950">{status.propertyAddress}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Loss type</dt>
                <dd className="mt-1 text-sm text-slate-950">{status.lossType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Date of loss</dt>
                <dd className="mt-1 text-sm text-slate-950">{status.dateOfLoss}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Claim status</dt>
                <dd className="mt-1 text-sm text-slate-950">{status.statusLabel}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <aside className="grid gap-6 content-start">
          <Card>
            <h2 className="text-base font-semibold text-slate-950">Requested documents</h2>
            {status.requestedDocuments.length === 0 ? (
              <EmptyState title="No client document requests are open right now" message="The office is not waiting on any client documents at the moment." />
            ) : (
              <div className="mt-4 grid gap-3">
                {status.requestedDocuments.map((document) => (
                  <div key={document.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-slate-950">{document.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={document.tone}>{document.statusLabel}</Badge>
                        {document.clientProvided ? <Badge tone="teal">Client uploaded</Badge> : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs font-medium uppercase tracking-normal text-slate-500">{document.categoryLabel}</p>
                    {document.note ? <p className="mt-2 text-sm leading-6 text-slate-700">{document.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {allowClientUpload && statusToken ? (
            <Card className="grid gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Send a document to the office</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Send a file when you are ready. If the office asked for a specific document, choose it from the list below.</p>
              </div>
              <ActionForm action={uploadStatusDocumentWithState.bind(null, statusToken)} className="grid gap-3">
                {openDocumentRequests.length > 0 ? (
                  <Field label="This is for" hint="Optional. Pick the request this file answers so the office can match it faster.">
                    <select name="requestedDocumentId" defaultValue="" className={selectClassName}>
                      <option value="">No specific request</option>
                      {openDocumentRequests.map((document) => (
                        <option key={document.id} value={document.id}>{document.title}</option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="File" hint="Choose one file to send (up to 25 MB). PDFs and photos work best.">
                  <input name="file" type="file" className={inputClassName} />
                  <FieldError name="file" />
                </Field>
                <Field label="Title" hint="Optional. Add a short name if you want the office to see something more specific than the file name.">
                  <input name="title" className={inputClassName} placeholder="Roof photos, receipts, policy pages..." />
                </Field>
                <SubmitButton>Send document</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-base font-semibold text-slate-950">Office contact</h2>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Adjuster</dt>
                <dd className="mt-1 text-sm text-slate-950">{status.officeContact.adjuster}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Office</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-950">
                  {status.officeContact.phone}
                  <br />
                  {status.officeContact.email}
                </dd>
              </div>
              {status.lastViewedAt ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Last viewed</dt>
                  <dd className="mt-1 text-sm text-slate-950">{status.lastViewedAt}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}