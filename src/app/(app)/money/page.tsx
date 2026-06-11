import Link from "next/link";
import { Download } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section, StatCard, inputClassName, selectClassName, SubmitButton } from "@/components/ui";
import { formatDate, formatMoney, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, isInvoiceOverdue, propertyAddress } from "@/lib/format";
import { invoiceStatusOptions } from "@/lib/options";
import { getMoneyData } from "@/lib/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const bucketOptions = [
  ["ALL", "All"],
  ["OVERDUE", "Overdue"],
  ["DUE_SOON", "Due soon"],
  ["PAID", "Paid"],
  ["UNPAID", "Unpaid"],
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isOpenInvoice(invoice: { status: string }) {
  return !["PAID", "WRITTEN_OFF"].includes(invoice.status);
}

function isPaidInvoice(invoice: { status: string; feeAmountCents: number; amountPaidCents: number }) {
  return invoice.status === "PAID" || invoice.status === "WRITTEN_OFF" || invoiceAmountDue(invoice) === 0;
}

function isDueSoonInvoice(invoice: {
  status: string;
  dueAt?: Date | string | null;
  feeAmountCents: number;
  amountPaidCents: number;
}) {
  if (!invoice.dueAt || !isOpenInvoice(invoice) || isInvoiceOverdue(invoice)) return false;
  const due = new Date(invoice.dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);
  return due >= today && due <= soon;
}

export default async function MoneyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { invoices, payments } = await getMoneyData();
  const q = firstValue(params.q)?.trim() ?? "";
  const normalizedQuery = q.toLowerCase();
  const status = firstValue(params.status)?.trim() ?? "ALL";
  const bucket = firstValue(params.bucket)?.trim() ?? "ALL";
  const hasFilters = Boolean(q) || status !== "ALL" || bucket !== "ALL";
  const moneyExportParams = new URLSearchParams({ status, bucket });
  if (q.length > 0) moneyExportParams.set("q", q);
  const moneyExportHref = `/api/export/invoices?${moneyExportParams.toString()}`;

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesQuery =
      q.length === 0 ||
      [
        invoice.invoiceNumber,
        fullName(invoice.claim.contact),
        propertyAddress(invoice.claim.property),
        invoice.claim.claimNumber ?? "",
        invoice.claim.carrier?.name ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

    const matchesStatus = status === "ALL" || invoice.status === status;

    const matchesBucket =
      bucket === "ALL" ||
      (bucket === "OVERDUE" && isInvoiceOverdue(invoice)) ||
      (bucket === "DUE_SOON" && isDueSoonInvoice(invoice)) ||
      (bucket === "PAID" && isPaidInvoice(invoice)) ||
      (bucket === "UNPAID" && isOpenInvoice(invoice) && invoiceAmountDue(invoice) > 0);

    return matchesQuery && matchesStatus && matchesBucket;
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesQuery =
      q.length === 0 ||
      [
        payment.payee,
        payment.checkNumber ?? "",
        fullName(payment.claim.contact),
        propertyAddress(payment.claim.property),
        payment.claim.claimNumber ?? "",
        payment.claim.carrier?.name ?? "",
        payment.invoice?.invoiceNumber ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

    const matchesStatus = status === "ALL" || payment.invoice?.status === status;
    const matchesBucket = bucket === "ALL" || bucket === "PAID";
    return matchesQuery && matchesStatus && matchesBucket;
  });

  const openInvoices = filteredInvoices.filter((invoice) => isOpenInvoice(invoice));
  const outstandingReceivablesCents = openInvoices.reduce((sum, invoice) => sum + invoiceAmountDue(invoice), 0);
  const overdueInvoiceCount = filteredInvoices.filter((invoice) => isInvoiceOverdue(invoice)).length;
  const paidCollectedCents = filteredPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const totalMatchingRecords = filteredInvoices.length + filteredPayments.length;
  const noMoneyRecords = invoices.length === 0 && payments.length === 0 && !hasFilters;
  const noFilteredResults = !noMoneyRecords && totalMatchingRecords === 0;

  return (
    <>
      <PageHeader
        title="Money"
        description="Track settlement checks, fee invoices, and receivables across the office."
      />

      <Card className="bg-slate-50">
        <p className="text-sm font-semibold text-slate-950">How to use Money</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Record the settlement amount or expected recovery from the claim money page.</li>
          <li>Track the fee invoice amount once settlement and fee terms are known.</li>
          <li>Record payment when the office receives the check or fee payment.</li>
          <li>Use reports to monitor open balances and total collected amounts.</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>
          <ButtonLink href="/reports" variant="secondary">Open reports</ButtonLink>
        </div>
      </Card>

      <Card>
        <p className="text-xs text-slate-500">Tip: most offices filter for unpaid or overdue invoices first, then record checks from each claim money page.</p>
        <form method="get" action="/money" className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <input name="q" defaultValue={q} className={inputClassName} placeholder="Search client, claim number, property, invoice, payee, check, or carrier" />
          <select name="status" defaultValue={status} className={selectClassName}>
            <option value="ALL">All invoice statuses</option>
            {invoiceStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="bucket" defaultValue={bucket} className={selectClassName}>
            {bucketOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="flex items-center gap-3">
            <SubmitButton variant="secondary">Filter</SubmitButton>
            <ButtonLink href={moneyExportHref} variant="secondary"><Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export CSV</ButtonLink>
            {hasFilters ? <ButtonLink href="/money" variant="secondary">Clear filters</ButtonLink> : null}
          </div>
        </form>
      </Card>

      {noFilteredResults ? (
        <Card className="grid gap-3">
          <p className="font-medium text-slate-950">No money records match these filters.</p>
          {hasFilters ? <div><ButtonLink href="/money" variant="secondary">Clear filters</ButtonLink></div> : null}
        </Card>
      ) : null}

      {!noFilteredResults ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Outstanding receivables" value={formatMoney(outstandingReceivablesCents)} detail="Open balance from matching invoices" />
          <StatCard label="Overdue invoices" value={overdueInvoiceCount} detail="Matching invoices that are past due" />
          <StatCard label="Paid/collected" value={formatMoney(paidCollectedCents)} detail="Matching checks and fee payments" />
          <StatCard label="Matching records" value={totalMatchingRecords} detail="Invoices plus recent payments" />
        </div>
      ) : null}

      <Section title="Outstanding receivables" description="Open fee invoices that still need collection or follow-up.">
        {noMoneyRecords ? (
          <EmptyState
            title="No money records yet"
            message="Start on a claim money page: record settlement or expected recovery, create the fee invoice, then record payment when the office is paid."
            actions={
              <>
                <ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>
                <ButtonLink href="/office-resources" variant="secondary">Open Office Playbook</ButtonLink>
              </>
            }
          />
        ) : noFilteredResults ? null : openInvoices.length === 0 ? (
          <EmptyState title="No open receivables" message="Every matching invoice is paid or written off." />
        ) : (
          <div className="grid gap-3">
            {openInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/claims/${invoice.claim.id}/money`} className="font-semibold text-slate-950 hover:text-teal-800">
                        {invoice.invoiceNumber} · {fullName(invoice.claim.contact)}
                      </Link>
                      <Badge tone={invoiceStatusTone(invoice)}>{invoiceDisplayStatus(invoice)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{propertyAddress(invoice.claim.property)} · Due {formatDate(invoice.dueAt)}</p>
                    <p className="mt-1 text-sm text-slate-600">Next step: Open the claim money page to collect or record the remaining balance.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/claims/${invoice.claim.id}/money`} className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100">
                        Open money
                      </Link>
                      <Link href={`/claims/${invoice.claim.id}/tasks?action=add-task&taskTemplateKey=follow-up-on-receivable&duePreset=IN_3_DAYS`} className="inline-flex h-8 items-center justify-center rounded-md border border-teal-300 bg-teal-50 px-3 text-sm font-medium text-teal-900 transition hover:bg-teal-100">
                        Add receivable follow-up task
                      </Link>
                      <Link href={`/claims/${invoice.claim.id}/money?action=payment`} className="inline-flex h-8 items-center justify-center rounded-md border border-teal-300 bg-teal-50 px-3 text-sm font-medium text-teal-900 transition hover:bg-teal-100">
                        Record payment
                      </Link>
                      <Link href={`/claims/${invoice.claim.id}/communications?action=log-communication`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        Log note
                      </Link>
                    </div>
                  </div>
                  <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-3 lg:min-w-[430px] lg:text-right">
                    <p>Invoice {formatMoney(invoice.feeAmountCents)}</p>
                    <p>Paid {formatMoney(invoice.amountPaidCents)}</p>
                    <p>Open {formatMoney(invoiceAmountDue(invoice))}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent checks and fee payments" description="Recent settlement checks and fee payments already recorded on claim money pages.">
        {noMoneyRecords ? (
          <EmptyState
            title="No payments"
            message="Record settlement checks or invoice payments from a claim money tab."
            actions={<ButtonLink href="/claims" variant="secondary">Open claims</ButtonLink>}
          />
        ) : noFilteredResults ? null : filteredPayments.length === 0 ? (
          <EmptyState title="No payments" message="Record settlement checks or invoice payments from a claim money tab." />
        ) : (
          <div className="grid gap-3">
            {filteredPayments.map((payment) => (
              <Card key={payment.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/claims/${payment.claim.id}/money`} className="font-semibold text-slate-950 hover:text-teal-800">
                      {payment.payee}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      {fullName(payment.claim.contact)} · {payment.invoice ? `Fee payment for ${payment.invoice.invoiceNumber}` : "Settlement check"} · Paid {formatDate(payment.paidAt)} · Check {payment.checkNumber ?? "not set"}
                    </p>
                    <div className="mt-2">
                      <Link href={`/claims/${payment.claim.id}/money`} className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        Open money
                      </Link>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-slate-950">{formatMoney(payment.amountCents)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
