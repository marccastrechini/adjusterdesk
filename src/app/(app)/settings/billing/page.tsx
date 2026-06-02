import { openBillingPortalForCurrentWorkspace } from "@/lib/billing-actions";
import { getStripeConfigDiagnostics, resolveBillingProvider, stripeConfigured } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { planLabel, resolveIncludedUserLimit, subscriptionStatusLabel } from "@/lib/plans";
import { getUsers } from "@/lib/queries";
import { Badge, Card, Notice, PageHeader, Section, SubmitButton } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BillingSettingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const notice = getNoticeMessage(query);

  const { firm, users } = await getUsers();
  const activeUsers = users.filter((user) => user.active);
  const includedUserLimit = resolveIncludedUserLimit(firm);

  const billingProvider = resolveBillingProvider();
  const stripeReady = stripeConfigured();
  const stripeDiagnostics = getStripeConfigDiagnostics();
  const canUsePortal = billingProvider === "stripe" && stripeReady && Boolean(firm.billingCustomerId);

  return (
    <>
      <PageHeader
        title="Billing"
        description="Current plan, active users included, billing status, and billing timing for this workspace."
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Current plan</p>
          <p className="text-xl font-semibold text-slate-950">{planLabel(firm.subscriptionPlan)}</p>
          <p className="text-sm text-slate-700">{activeUsers.length} active of {includedUserLimit > 0 ? includedUserLimit : "custom"} included users</p>
        </Card>

        <Card className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Billing status</p>
          <p className="text-xl font-semibold text-slate-950">{subscriptionStatusLabel(firm.subscriptionStatus)}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={firm.subscriptionStatus === "ACTIVE" ? "green" : firm.subscriptionStatus === "PAST_DUE" ? "amber" : "slate"}>
              {subscriptionStatusLabel(firm.subscriptionStatus)}
            </Badge>
            <Badge tone="blue">{billingProvider === "stripe" ? "Stripe" : "Manual"}</Badge>
          </div>
        </Card>
      </div>

      <Section title="Billing mode">
        <Card className="grid gap-3">
          <p className="text-sm leading-6 text-slate-700">Billing begins after your first full calendar month of usage.</p>
          <p className="text-sm leading-6 text-slate-700">
            Until billing is activated, your selected plan is saved and your workspace remains on the current setup terms.
          </p>
          <p className="text-sm leading-6 text-slate-700">Billing started date: {firm.billingStartedAt ? formatDate(firm.billingStartedAt) : "Not set"}</p>
          <p className="text-sm leading-6 text-slate-700">Current period end: {firm.billingCurrentPeriodEnd ? formatDate(firm.billingCurrentPeriodEnd) : "Not set"}</p>

          {billingProvider === "stripe" ? (
            <>
              <p className="text-sm leading-6 text-slate-700">
                Billing provider is set to Stripe for this environment.
              </p>
              {stripeReady ? (
                <p className="text-sm leading-6 text-slate-700">
                  Stripe customer: {firm.billingCustomerId ?? "Not linked yet"}<br />
                  Stripe subscription: {firm.billingSubscriptionId ?? "Not linked yet"}
                </p>
              ) : (
                <div className="grid gap-2 text-sm leading-6 text-slate-700">
                  <p>
                    Stripe keys or price IDs are missing in this environment. Billing links remain disabled until configuration is complete.
                  </p>
                  {stripeDiagnostics.missingVars.length > 0 ? <p>Missing setup: {stripeDiagnostics.missingVars.join(", ")}</p> : null}
                </div>
              )}
              {canUsePortal ? (
                <form action={openBillingPortalForCurrentWorkspace}>
                  <SubmitButton>Open billing portal</SubmitButton>
                </form>
              ) : (
                <p className="text-sm leading-6 text-slate-700">Contact support to change billing.</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-700">
                Billing mode is manual in this environment.
              </p>
              <p className="text-sm leading-6 text-slate-700">Contact support to change billing.</p>
            </>
          )}
        </Card>
      </Section>
    </>
  );
}
