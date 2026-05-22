import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createInvoice, createSettlementRound, recordPayment } from "@/lib/actions";
import { formatDate, formatMoney, formatPercentFromBasisPoints, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum } from "@/lib/format";
import { invoiceStatusOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

type PageProps = { params: Promise<{ id: string }> };

const settlementStatusOptions = [
  ["DEMAND_SENT", "Demand sent"],
  ["OFFER_RECEIVED", "Offer received"],
  ["ACCEPTED", "Accepted"],
  ["REJECTED", "Rejected"],
] as const;

export default async function ClaimMoneyPage({ params }: PageProps) {
  const { id } = await params;
  const { claim } = await getClaim(id);
  const returnPath = `/claims/${claim.id}/money`;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} money`} description="Track demands, carrier offers, settlement checks, fee calculations, invoices, and receivables." actions={<ButtonLink href="/money" variant="secondary">All receivables</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <Section title="Settlement rounds">
            {claim.settlementRounds.length === 0 ? (
              <EmptyState title="No settlement rounds" message="Record the demand amount, carrier offer, and accepted amount when negotiations start." />
            ) : (
              <div className="grid gap-3">
                {claim.settlementRounds.map((round) => (
                  <Card key={round.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">Round {round.roundNumber}</p>
                          <Badge tone={round.status === "ACCEPTED" ? "green" : round.status === "REJECTED" ? "red" : "amber"}>{labelFromEnum(round.status)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">Offered {formatDate(round.offeredAt)}</p>
                      </div>
                      <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-3 lg:min-w-[420px] lg:text-right">
                        <p>Demand {formatMoney(round.demandAmountCents)}</p>
                        <p>Offer {formatMoney(round.offerAmountCents)}</p>
                        <p>Accepted {formatMoney(round.acceptedAmountCents)}</p>
                      </div>
                    </div>
                    {round.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{round.notes}</p> : null}
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Settlement checks and fee payments">
            {claim.payments.length === 0 ? (
              <EmptyState title="No payments" message="Record settlement checks or invoice payments as they arrive." />
            ) : (
              <div className="grid gap-3">
                {claim.payments.map((payment) => (
                  <Card key={payment.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{payment.payee}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {payment.invoice ? `Fee payment for ${payment.invoice.invoiceNumber}` : "Settlement check"} · Paid {formatDate(payment.paidAt)} · Check {payment.checkNumber ?? "not set"}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-slate-950">{formatMoney(payment.amountCents)}</p>
                    </div>
                    {payment.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{payment.notes}</p> : null}
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Invoices">
            {claim.invoices.length === 0 ? (
              <EmptyState title="No invoices" message="Create a fee invoice once the settlement amount and fee percentage are known." />
            ) : (
              <div className="grid gap-3">
                {claim.invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                          <Badge tone={invoiceStatusTone(invoice)}>{invoiceDisplayStatus(invoice)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">Issued {formatDate(invoice.issuedAt)} · Due {formatDate(invoice.dueAt)}</p>
                      </div>
                      <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-3 lg:min-w-[430px] lg:text-right">
                        <p>Settlement {formatMoney(invoice.settlementAmountCents)}</p>
                        <p>Fee {formatPercentFromBasisPoints(invoice.feePercentageBasisPoints)}</p>
                        <p>Due {formatMoney(invoiceAmountDue(invoice))}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="grid gap-6 content-start">
          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Add settlement round</h2>
            <form action={createSettlementRound} className="grid gap-3">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Demand amount"><input name="demandAmount" type="number" min="0" step="0.01" className={inputClassName} /></Field>
              <Field label="Offer amount"><input name="offerAmount" type="number" min="0" step="0.01" className={inputClassName} /></Field>
              <Field label="Accepted amount"><input name="acceptedAmount" type="number" min="0" step="0.01" className={inputClassName} /></Field>
              <Field label="Status">
                <select name="status" defaultValue="OFFER_RECEIVED" className={selectClassName}>
                  {settlementStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Offer date"><input name="offeredAt" type="date" className={inputClassName} /></Field>
              <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
              <SubmitButton>Add settlement</SubmitButton>
            </form>
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Record payment/check</h2>
            <form action={recordPayment} className="grid gap-3">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Apply to invoice">
                <select name="invoiceId" className={selectClassName}>
                  <option value="">Settlement check or no invoice</option>
                  {claim.invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber}</option>)}
                </select>
              </Field>
              <Field label="Amount"><input name="amount" type="number" min="0" step="0.01" required className={inputClassName} /></Field>
              <Field label="Payment date"><input name="paidAt" type="date" className={inputClassName} /></Field>
              <Field label="Check number"><input name="checkNumber" className={inputClassName} /></Field>
              <Field label="Payee"><input name="payee" required className={inputClassName} /></Field>
              <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
              <SubmitButton>Record payment</SubmitButton>
            </form>
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Create fee invoice</h2>
            <form action={createInvoice} className="grid gap-3">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Invoice number"><input name="invoiceNumber" required placeholder="AD-1002" className={inputClassName} /></Field>
              <Field label="Settlement amount"><input name="settlementAmount" type="number" min="0" step="0.01" required className={inputClassName} /></Field>
              <Field label="Fee percent"><input name="feePercent" type="number" min="0" step="0.01" defaultValue="10" required className={inputClassName} /></Field>
              <Field label="Status">
                <select name="status" defaultValue="DRAFT" className={selectClassName}>
                  {invoiceStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Issued date"><input name="issuedAt" type="date" className={inputClassName} /></Field>
              <Field label="Due date"><input name="dueAt" type="date" className={inputClassName} /></Field>
              <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
              <SubmitButton>Create invoice</SubmitButton>
            </form>
          </Card>
        </aside>
      </div>
    </>
  );
}
