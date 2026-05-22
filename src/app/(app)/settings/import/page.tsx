import { importCsv } from "@/lib/actions";
import { Card, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton } from "@/components/ui";

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

  return (
    <>
      <PageHeader title="CSV Import" description="Bring a basic lead or claim spreadsheet into the local MVP using simple column names." />

      {imported ? (
        <Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
          Imported {imported} {type === "claims" ? "claims" : "leads"}.
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Import CSV</h2>
          <form action={importCsv} className="grid gap-3">
            <Field label="Import type">
              <select name="importType" className={selectClassName} defaultValue="leads">
                <option value="leads">Leads</option>
                <option value="claims">Claims</option>
              </select>
            </Field>
            <Field label="CSV file"><input name="file" type="file" accept=".csv,text/csv" required className={inputClassName} /></Field>
            <SubmitButton>Import CSV</SubmitButton>
          </form>
        </Card>

        <Section title="Accepted columns" description="Use lowercase column names or the plain spreadsheet labels shown here.">
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
        </Section>
      </div>
    </>
  );
}
