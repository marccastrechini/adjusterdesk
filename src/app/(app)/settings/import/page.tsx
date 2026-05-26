import { importCsv } from "@/lib/actions";
import { ButtonLink, Card, Field, Notice, inputClassName, PageHeader, Section, selectClassName, SubmitButton } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const imported = firstValue(params.imported);
  const type = firstValue(params.type);
  const error = firstValue(params.error);

  const importErrorMessage =
    error === "file"
      ? "Choose a CSV file before starting the import."
      : error === "import-type"
        ? "Choose whether you are importing leads or claims."
        : error === "rows"
          ? "The CSV did not include any usable rows to import."
          : error === "csv"
            ? "We could not read that file as CSV. Check the file format and try again."
            : undefined;

  return (
    <>
      <PageHeader title="CSV Import" description="Import simple lead or claim spreadsheets. You can clean up missing details after the import." />

      {importErrorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Import not completed</p>
          <p className="mt-1 leading-6">{importErrorMessage}</p>
        </Card>
      ) : null}

      {imported ? (
        <Notice title="Import completed">Imported {imported} {type === "claims" ? "claims" : "leads"}.</Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Import CSV</h2>
          <p className="text-sm leading-6 text-slate-600">Supported import types are leads and claims. Use one worksheet export per import.</p>
          <form action={importCsv} className="grid gap-3">
            <Field label="Import type">
              <select name="importType" className={selectClassName} defaultValue={type === "claims" ? "claims" : "leads"}>
                <option value="leads">Leads</option>
                <option value="claims">Claims</option>
              </select>
            </Field>
            <Field label="CSV file"><input name="file" type="file" accept=".csv,text/csv" className={inputClassName} /></Field>
            <SubmitButton>Import CSV</SubmitButton>
          </form>

          <div className="grid gap-2 pt-2">
            <ButtonLink href="/api/import-template/leads" variant="secondary">Download leads sample CSV</ButtonLink>
            <ButtonLink href="/api/import-template/claims" variant="secondary">Download claims sample CSV</ButtonLink>
          </div>
        </Card>

        <Section title="Expected columns" description="Use these column names exactly or the matching plain spreadsheet labels.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="font-semibold text-slate-950">Leads</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">firstName, lastName, email, phone, address1, city, state, postalCode, source, referralSource, lossType, dateOfLoss, followUpDate, notes</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-950">Claims</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">firstName, lastName, email, phone, address1, city, state, postalCode, carrierName, policyNumber, claimNumber, lossType, dateOfLoss</p>
            </Card>
          </div>
          <Card>
            <p className="text-sm leading-6 text-slate-600">Tip: if some values are missing after import, open the new lead or claim and update the details manually.</p>
          </Card>
        </Section>
      </div>
    </>
  );
}
