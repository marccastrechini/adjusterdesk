"use client";

import { useActionState } from "react";
import { confirmSpreadsheetImport, previewSpreadsheetImport, type SpreadsheetImportState } from "@/lib/import-actions";
import type { ImportRowValues } from "@/lib/import-utils";
import { Badge, ButtonLink, Card, Field, inputClassName, selectClassName, StatCard, SubmitButton } from "@/components/ui";

const emptyState: SpreadsheetImportState = {};

function clientName(values: ImportRowValues) {
  return [values.firstName, values.lastName].filter(Boolean).join(" ") || "Client to confirm";
}

export function SpreadsheetImportForm({ defaultImportType = "leads", returnPath = "/start/import" }: { defaultImportType?: "leads" | "claims"; returnPath?: string }) {
  const [previewState, previewAction] = useActionState(previewSpreadsheetImport, emptyState);
  const [importState, importAction] = useActionState(confirmSpreadsheetImport, emptyState);
  const state = importState.preview || importState.message ? importState : previewState;
  const selectedType = state.importType ?? defaultImportType;
  const preview = state.preview;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="grid content-start gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Upload your spreadsheet</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Start with a CSV file. You will review the rows before anything is imported.</p>
        </div>

        {state.message ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">Import not ready</p>
            <p className="mt-1 leading-6">{state.message}</p>
          </div>
        ) : null}

        <form action={previewAction} className="grid gap-3">
          <Field label="What are you importing?">
            <select key={selectedType} name="importType" className={selectClassName} defaultValue={selectedType}>
              <option value="leads">Leads</option>
              <option value="claims">Claims</option>
            </select>
          </Field>
          <Field label="CSV file" hint="Use the starter template if you are not sure which columns to use.">
            <input name="file" type="file" accept=".csv,text/csv" className={inputClassName} />
          </Field>
          <SubmitButton>Review spreadsheet</SubmitButton>
        </form>

        <div className="grid gap-2 border-t border-slate-200 pt-4">
          <ButtonLink href="/api/import-template/leads" variant="secondary">Download leads template</ButtonLink>
          <ButtonLink href="/api/import-template/claims" variant="secondary">Download claims template</ButtonLink>
          <ButtonLink href="/api/import-template/sample-office-leads" variant="secondary">Download sample office lead list</ButtonLink>
        </div>
      </Card>

      <div className="grid gap-4 content-start">
        {preview ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Ready to import" value={preview.validCount} detail={preview.importType === "claims" ? "Claims ready" : "Leads ready"} />
              <StatCard label="Needs work" value={preview.invalidCount} detail="Rows with missing or unclear details" />
              <StatCard label="Rows reviewed" value={preview.rows.length} detail={state.fileName ?? "CSV file"} />
            </div>

            {preview.missingColumns.length > 0 ? (
              <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
                <p className="font-semibold">Missing columns</p>
                <p className="mt-1 leading-6">Add these columns to the CSV, then upload it again: {preview.missingColumns.join(", ")}.</p>
              </Card>
            ) : null}

            <Card className="grid gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Review before importing</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Rows marked Ready can be imported now. Rows marked Needs work will be skipped.</p>
                </div>
                {preview.validCount > 0 ? (
                  <form action={importAction}>
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <input type="hidden" name="importType" value={preview.importType} />
                    <input type="hidden" name="rawCsv" value={state.rawCsv ?? ""} />
                    <SubmitButton>Import valid rows</SubmitButton>
                  </form>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[5rem_1fr_1fr_1fr] gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500 sm:grid">
                  <span>Row</span>
                  <span>Client</span>
                  <span>Property</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {preview.rows.map((row) => (
                    <div key={row.rowNumber} className="grid gap-3 px-3 py-3 text-sm sm:grid-cols-[5rem_1fr_1fr_1fr]">
                      <span className="text-slate-500">{row.rowNumber}</span>
                      <div>
                        <p className="font-medium text-slate-950">{clientName(row.values)}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.values.lossType || "Loss type missing"}</p>
                      </div>
                      <p className="text-slate-700">{row.values.address1 || "Address missing"}</p>
                      <div className="grid gap-2">
                        <Badge tone={row.errors.length > 0 ? "amber" : "green"}>{row.errors.length > 0 ? "Needs work" : "Ready"}</Badge>
                        {row.errors.length > 0 ? (
                          <ul className="grid gap-1 text-xs leading-5 text-amber-800">
                            {row.errors.map((error) => <li key={error}>{error}</li>)}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="grid gap-3 border-dashed">
            <h2 className="text-base font-semibold text-slate-950">Review comes next</h2>
            <p className="text-sm leading-6 text-slate-600">
              After you upload a CSV, AdjusterDesk will show which rows are ready and which rows need a missing name, property address, loss type, or date fix.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}