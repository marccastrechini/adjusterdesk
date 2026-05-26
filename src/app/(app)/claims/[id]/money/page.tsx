import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createInvoiceWithState, createSettlementRoundWithState, recordPaymentWithState } from "@/lib/actions";
import { formatDate, formatMoney, formatPercentFromBasisPoints, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { invoiceStatusOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const settlementStatusOptions = [
  ["DEMAND_SENT", "Demand sent"],
  ["OFFER_RECEIVED", "Offer received"],
  ["ACCEPTED", "Accepted"],
  ["REJECTED", "Rejected"],
] as const;

export default async function ClaimMoneyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/money`;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} money`} description="Track demands, carrier offers, settlement checks, fee calculations, invoices, and receivables." actions={<ButtonLink href="/money" variant="secondary">All receivables</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

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
            <p className="text-sm leading-6 text-slate-600">Use this for each demand, carrier offer, and accepted settlement amount. Amounts are entered in dollars.</p>
            <ActionForm action={createSettlementRoundWithState} className="grid gap-3">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Demand amount" hint="Dollar amount requested from the carrier."><input name="demandAmount" type="number" min="0" step="0.01" className={inputClassName} /><FieldError name="demandAmount" /></Field>
              <Field label="Offer amount" hint="Dollar amount offered by the carrier."><input name="offerAmount" type="number" min="0" step="0.01" className={inputClassName} /><FieldError name="offerAmount" /></Field>
              <Field label="Accepted amount" hint="Fill this only when the client accepts the amount."><input name="acceptedAmount" type="number" min="0" step="0.01" className={inputClassName} /><FieldError name="acceptedAmount" /></Field>
              <Field label="Status" hint="Accepted will mark the claim settled.">
                <select name="status" defaultValue="OFFER_RECEIVED" className={selectClassName}>
                  {settlementStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Offer date" hint="Leave blank to use today."><input name="offeredAt" type="date" className={inputClassName} /></Field>
              <Field label="Notes" hint="Add short negotiation context or what changed from the last round."><textarea name="notes" className={textareaClassName} /></Field>
              <SubmitButton>Save settlement round</SubmitButton>
            </ActionForm>
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Record payment/check</h2>
            <p className="text-sm leading-6 text-slate-600">Record settlement checks or fee payments. Choose an invoice only when the payment should reduce that invoice balance.</p>
            <ActionForm action={recordPaymentWithState} className="grid gap-3">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Apply to invoice" hint="Leave this as settlement check or no invoice for carrier settlement checks.">
                <select name="invoiceId" className={selectClassName}>
                  <option value="">Settlement check or no invoice</option>
                  {claim.invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber}</option>)}
                </select>
              </Field>
              <Field label="Amount" required hint="Dollar amount of the check or payment."><input name="amount" type="number" min="0" step="0.01" required className={inputClassName} /><FieldError name="amount" /></Field>
              <Field label="Payment date" hint="Leave blank to use today."><input name="paidAt" type="date" className={inputClassName} /></Field>
              <Field label="Check number" hint="Optional, but useful for office records."><input name="checkNumber" className={inputClassName} /></Field>
              <Field label="Payee" required hint="Who the check was made out to."><input name="payee" required className={inputClassName} /><FieldError name="payee" /></Field>
              <Field label="Notes" hint="Add any split-payee, mailing, or balance detail."><textarea name="notes" className={textareaClassName} /></Field>
              <SubmitButton>Record check or payment</SubmitButton>
            </ActionForm>
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Create fee invoice</h2>
            <p className="text-sm leading-6 text-slate-600">Create the public adjusting fee invoice after the settlement amount and fee percentage are known.</p>
            <ActionForm action={createInvoiceWithState} className="grid gap-3">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Invoice number" required hint="Use the office invoice number."><input name="invoiceNumber" required placeholder="AD-1002" className={inputClassName} /><FieldError name="invoiceNumber" /></Field>
              <Field label="Settlement amount" required hint="Dollar amount used to calculate the fee."><input name="settlementAmount" type="number" min="0" step="0.01" required className={inputClassName} /><FieldError name="settlementAmount" /></Field>
              <Field label="Fee percent" required hint="Enter 10 for a 10% fee."><input name="feePercent" type="number" min="0" step="0.01" defaultValue="10" required className={inputClassName} /><FieldError name="feePercent" /></Field>
              <Field label="Status" hint="Use Draft until the invoice has actually been sent.">
                <select name="status" defaultValue="DRAFT" className={selectClassName}>
                  {invoiceStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Issued date" hint="Leave blank to use today."><input name="issuedAt" type="date" className={inputClassName} /></Field>
              <Field label="Due date" hint="Use the date the office expects payment."><input name="dueAt" type="date" className={inputClassName} /></Field>
              <Field label="Notes" hint="Add fee basis, check timing, or collection notes."><textarea name="notes" className={textareaClassName} /></Field>
              <SubmitButton>Create fee invoice</SubmitButton>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </>
  );
}
