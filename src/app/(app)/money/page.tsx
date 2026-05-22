import Link from "next/link";
import { Download } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section, StatCard } from "@/components/ui";
import { formatDate, formatMoney, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getMoneyData } from "@/lib/queries";

export default async function MoneyPage() {
  const { invoices, payments, outstandingCents, paidInvoiceCents } = await getMoneyData();
  const openInvoices = invoices.filter((invoice) => !["PAID", "WRITTEN_OFF"].includes(invoice.status));

  return (
    <>
      <PageHeader
        title="Money"
        description="Track settlement checks, fee invoices, and receivables across the office."
        actions={<ButtonLink href="/api/export/invoices" variant="secondary"><Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export invoices</ButtonLink>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Outstanding receivables" value={formatMoney(outstandingCents)} detail="Sent, partially paid, or overdue" />
        <StatCard label="Open invoices" value={openInvoices.length} detail="Invoices still needing attention" />
        <StatCard label="Paid fee invoices" value={formatMoney(paidInvoiceCents)} detail="Fee invoices marked paid" />
      </div>

      <Section title="Receivables">
        {openInvoices.length === 0 ? (
          <EmptyState title="No open receivables" message="There are no sent, partially paid, draft, or overdue invoices." />
        ) : (
          <div className="grid gap-3">
            {openInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/claims/${invoice.claim.id}/money`} className="font-semibold text-slate-950 hover:text-teal-800">
                        {invoice.invoiceNumber} · {fullName(invoice.claim.contact)}
                      </Link>
                      <Badge tone={invoice.status === "OVERDUE" ? "red" : invoice.status === "DRAFT" ? "slate" : "amber"}>{labelFromEnum(invoice.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{propertyAddress(invoice.claim.property)} · Due {formatDate(invoice.dueAt)}</p>
                  </div>
                  <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-3 lg:min-w-[430px] lg:text-right">
                    <p>Invoice {formatMoney(invoice.feeAmountCents)}</p>
                    <p>Paid {formatMoney(invoice.amountPaidCents)}</p>
                    <p>Open {formatMoney(invoice.feeAmountCents - invoice.amountPaidCents)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent checks and payments">
        {payments.length === 0 ? (
          <EmptyState title="No payments" message="Record settlement checks or invoice payments from a claim money tab." />
        ) : (
          <div className="grid gap-3">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/claims/${payment.claim.id}/money`} className="font-semibold text-slate-950 hover:text-teal-800">
                      {payment.payee}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{fullName(payment.claim.contact)} · Paid {formatDate(payment.paidAt)} · Check {payment.checkNumber ?? "not set"}</p>
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
