import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { CopyTextButton } from "@/components/copy-text-button";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createInvoiceWithState, createSettlementRoundWithState, recordPaymentWithState } from "@/lib/actions";
import { formatDate, formatMoney, formatPercentFromBasisPoints, fullName, invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum } from "@/lib/format";
import { sendClientPaymentRequest } from "@/lib/client-billing/actions";
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

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClaimMoneyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { firm, claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/money`;
  const action = firstValue(query.action);
  const selectedAction = action === "settlement" || action === "payment" || action === "invoice" ? action : undefined;

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
                      <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-3 lg:text-right">
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
                      <div className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-3 lg:text-right">
                        <p>Settlement {formatMoney(invoice.settlementAmountCents)}</p>
                        <p>Fee {formatPercentFromBasisPoints(invoice.feePercentageBasisPoints)}</p>
                        <p>Calculated fee {formatMoney(invoice.feeAmountCents)}</p>
                        <p>Payment received {invoice.amountPaidCents > 0 ? formatMoney(invoice.amountPaidCents) : "No payment yet"}</p>
                        <p>Open balance {formatMoney(invoiceAmountDue(invoice))}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-950">Provider</p>
                        <Badge tone={invoice.clientBillingProvider === "STRIPE_CONNECT" ? "blue" : "slate"}>{invoice.clientBillingProvider ?? firm.clientBillingProvider}</Badge>
                        {invoice.externalInvoiceStatus ? <Badge tone="amber">{labelFromEnum(invoice.externalInvoiceStatus)}</Badge> : <Badge tone="slate">Not sent</Badge>}
                      </div>
                      <p>External status: {invoice.externalInvoiceStatus ?? "Not sent"}</p>
                      <p>Last synced: {invoice.externalSyncedAt ? formatDate(invoice.externalSyncedAt) : "Not synced"}</p>
                      <div className="flex flex-wrap gap-2">
                        {invoice.externalHostedInvoiceUrl ? (
                          <a href={invoice.externalHostedInvoiceUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                            Open payment link
                          </a>
                        ) : null}
                        {invoice.externalHostedInvoiceUrl ? <CopyTextButton text={invoice.externalHostedInvoiceUrl} label="Copy payment link" /> : null}
                        {invoice.externalInvoicePdfUrl ? (
                          <a href={invoice.externalInvoicePdfUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                            Open PDF
                          </a>
                        ) : null}
                      </div>
                      {firm.clientBillingProvider === "STRIPE_CONNECT" && firm.clientBillingEnabled && !invoice.externalInvoiceId ? (
                        <form action={sendClientPaymentRequest} className="pt-1">
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <SubmitButton>Send payment request</SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="grid gap-6 content-start">
          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Money actions</h2>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Recommended order</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
                <li>Record settlement or expected recovery.</li>
                <li>Create the fee invoice.</li>
                <li>Record payment/check when funds are received.</li>
                <li>Review receivables on the Money page and reports.</li>
              </ol>
            </div>

            {!selectedAction ? (
              <div className="grid gap-4">
                <div>
                  <ButtonLink href={`${returnPath}?action=settlement`} variant="primary">Add settlement round</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Track each demand, offer, and accepted amount during negotiation.</p>
                </div>
                <div>
                  <ButtonLink href={`${returnPath}?action=payment`} variant="secondary">Record payment/check</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Log settlement checks and payments applied to invoices.</p>
                </div>
                <div>
                  <ButtonLink href={`${returnPath}?action=invoice`} variant="secondary">Create fee invoice</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Create a fee invoice once settlement and fee terms are known.</p>
                </div>
                <div>
                  <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=send-invoice&duePreset=TODAY`} variant="secondary">Add send invoice follow-up</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Create a same-day reminder to send the fee invoice.</p>
                </div>
                <div>
                  <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=follow-up-on-receivable&duePreset=IN_3_DAYS`} variant="secondary">Add receivable follow-up</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Set the next check-in for unpaid invoice balances.</p>
                </div>
              </div>
            ) : null}

            {selectedAction === "settlement" ? (
              <ActionForm action={createSettlementRoundWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <p className="text-sm leading-6 text-slate-600">Use this for each demand, carrier offer, and accepted settlement amount. Amounts are entered in dollars.</p>
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
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Save settlement round</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}

            {selectedAction === "payment" ? (
              <ActionForm action={recordPaymentWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <p className="text-sm leading-6 text-slate-600">Record settlement checks or fee payments. Choose an invoice only when the payment should reduce that invoice balance.</p>
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
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Record check or payment</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}

            {selectedAction === "invoice" ? (
              <ActionForm action={createInvoiceWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <p className="text-sm leading-6 text-slate-600">Create the public adjusting fee invoice after the settlement amount and fee percentage are known.</p>
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
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Create fee invoice</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}

            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Suggested next steps</p>
              <p className="mt-1 text-xs text-slate-500">Use simple reminders for invoice and receivable follow-ups.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=send-invoice&duePreset=TODAY`} variant="secondary">Send invoice</ButtonLink>
                <ButtonLink href={`/claims/${claim.id}/tasks?action=add-task&taskTemplateKey=follow-up-on-receivable&duePreset=IN_3_DAYS`} variant="secondary">Follow up on receivable</ButtonLink>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
