import { ButtonLink, Card, Notice, PageHeader, Section } from "@/components/ui";
import { SpreadsheetImportForm } from "@/components/spreadsheet-import-form";
import { normalizeImportType } from "@/lib/import-utils";

type SpreadsheetImportPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
  returnPath: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function SpreadsheetImportPage({ searchParams, returnPath }: SpreadsheetImportPageProps) {
  const imported = firstValue(searchParams.imported);
  const skipped = firstValue(searchParams.skipped) ?? "0";
  const importType = normalizeImportType(firstValue(searchParams.type)) ?? "leads";
  const listHref = importType === "claims" ? "/claims" : "/leads";

  return (
    <>
      <PageHeader
        title="Spreadsheet import"
        description="Upload your lead or claim list, review the rows, then import starter records for your office."
        actions={
          <>
            <ButtonLink href="/start" variant="secondary">Start checklist</ButtonLink>
            <ButtonLink href={listHref} variant="secondary">Open {importType === "claims" ? "claims" : "leads"}</ButtonLink>
          </>
        }
      />

      {imported ? (
        <Notice title="Import completed">
          Imported {imported} {importType === "claims" ? "claims" : "leads"}. Skipped {skipped} row{skipped === "1" ? "" : "s"} that needed more work. <a className="font-semibold underline" href={listHref}>Open {importType === "claims" ? "claims" : "leads"}</a>.
        </Notice>
      ) : null}

      <SpreadsheetImportForm defaultImportType={importType} returnPath={returnPath} />

      <Section title="Expected spreadsheet columns" description="Use these starter column names. Plain labels like First Name, Property Address, and Date of Loss also work.">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-semibold text-slate-950">Leads</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">firstName, lastName, email, phone, address1, city, state, postalCode, source, referralSource, lossType, dateOfLoss, followUpDate, notes</p>
          </Card>
          <Card>
            <h2 className="font-semibold text-slate-950">Claims</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">firstName, lastName, email, phone, address1, city, state, postalCode, carrierName, policyNumber, claimNumber, lossType, dateOfLoss, reportedDate, inspectionDate, deadlineDate, notes</p>
          </Card>
        </div>
      </Section>
    </>
  );
}