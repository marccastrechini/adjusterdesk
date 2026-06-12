import { Badge, ButtonLink, Card, Field, PageHeader, Section, SubmitButton, inputClassName } from "@/components/ui";
import { getDemoContext } from "@/lib/app-context";
import { formatDate, labelFromEnum } from "@/lib/format";
import { startOrResumeClientBillingConnection, refreshClientBillingStatus, saveClientPaymentFeeSettings } from "@/lib/client-billing/actions";
import { getClientPaymentsPrimaryActionLabel } from "@/lib/client-billing/ui";

export default async function ClientPaymentsSettingsPage() {
  const { firm } = await getDemoContext();
  const providerLabel = labelFromEnum(firm.clientBillingProvider);
  const connectionStatusLabel = labelFromEnum(firm.clientBillingConnectionStatus);
  const connectActionLabel = getClientPaymentsPrimaryActionLabel(firm);

  return (
    <>
      <PageHeader
        title="Client Payments"
        description="Manage how this office sends fee invoices to clients and whether it recovers payment processing costs."
      />

      <Card className="border-amber-200 bg-amber-50 text-amber-950">
        <p className="text-sm font-semibold">Fee recovery stays off by default.</p>
        <p className="mt-1 text-sm leading-6">
          Payment processing surcharges, convenience fees, and fee recovery are restricted in some states and by card-network rules. If you enable them, this firm is responsible for compliance, notices, and required disclosures.
        </p>
        <p className="mt-1 text-sm leading-6">AdjusterDesk does not apply fee recovery automatically. It only adds an optional separate line item when you explicitly turn it on.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Current provider</p>
          <p className="text-xl font-semibold text-slate-950">{providerLabel}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={firm.clientBillingEnabled ? "green" : "amber"}>{firm.clientBillingEnabled ? "Enabled" : "Not enabled"}</Badge>
            <Badge tone={firm.clientBillingConnectionStatus === "ACTIVE" ? "green" : firm.clientBillingConnectionStatus === "RESTRICTED" ? "amber" : "slate"}>{connectionStatusLabel}</Badge>
          </div>
          <p className="text-sm text-slate-700">Stripe account: {firm.stripeConnectAccountId ?? "Not connected"}</p>
          <p className="text-sm text-slate-700">Charges enabled: {firm.stripeChargesEnabled ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-700">Payouts enabled: {firm.stripePayoutsEnabled ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-700">Details submitted: {firm.stripeDetailsSubmitted ? "Yes" : "No"}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {connectActionLabel ? (
              <form action={startOrResumeClientBillingConnection}>
                <SubmitButton>{connectActionLabel}</SubmitButton>
              </form>
            ) : null}
            <form action={refreshClientBillingStatus}>
              <SubmitButton variant="secondary">Refresh status</SubmitButton>
            </form>
            <ButtonLink href="/settings/billing" variant="secondary">Back to SaaS billing</ButtonLink>
          </div>
        </Card>

        <Card className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Last sync</p>
          <p className="text-sm leading-6 text-slate-700">Use this page after connecting Stripe to confirm the account has permission to create direct charges and send hosted invoices.</p>
          <p className="text-sm leading-6 text-slate-700">Updated: {formatDate(firm.updatedAt)}</p>
        </Card>
      </div>

      <Section title="Fee recovery" description="Keep this off unless the firm has reviewed the legal and card-network requirements.">
        <Card className="grid gap-4">
          <form action={saveClientPaymentFeeSettings} className="grid gap-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" name="clientPaymentFeeEnabled" defaultChecked={firm.clientPaymentFeeEnabled} className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700" />
                <span>
                  Enable fee recovery on client invoices.
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    This adds an optional separate line item when sending hosted invoices. It is not a default charge.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" name="clientPaymentFeeAcknowledged" defaultChecked={Boolean(firm.clientPaymentFeeAcknowledgedAt)} className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700" />
                <span>
                  I understand fee recovery may be restricted by card-network rules and state law, and this firm is responsible for compliance.
                </span>
              </label>
            </div>

            <Field label="Fee label" hint="Shown as a separate line item on the hosted invoice.">
              <input name="clientPaymentFeeLabel" defaultValue={firm.clientPaymentFeeLabel ?? "Client payment fee recovery"} className={inputClassName} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fee basis points" hint="Use 300 for 3.00%.">
                <input name="clientPaymentFeeBasisPoints" type="number" min="0" step="1" defaultValue={firm.clientPaymentFeeBasisPoints ?? 0} className={inputClassName} />
              </Field>
              <Field label="Fixed fee cents" hint="Optional flat recovery amount in cents.">
                <input name="clientPaymentFeeFixedCents" type="number" min="0" step="1" defaultValue={firm.clientPaymentFeeFixedCents ?? 0} className={inputClassName} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <SubmitButton>Save fee recovery settings</SubmitButton>
              <ButtonLink href="/settings" variant="secondary">Back to settings</ButtonLink>
            </div>
          </form>
        </Card>
      </Section>
    </>
  );
}
