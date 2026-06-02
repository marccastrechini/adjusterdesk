import { openBillingPortalForCurrentWorkspace } from "@/lib/billing-actions";
import { resolveBillingProvider, stripeConfigured } from "@/lib/billing";
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
  const canUsePortal = billingProvider === "stripe" && stripeReady && Boolean(firm.billingCustomerId);

  return (
    <>
      <PageHeader
        title="Billing"
        description="Current plan, subscription status, active users included, and billing mode for this workspace."
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Current plan</p>
          <p className="text-xl font-semibold text-slate-950">{planLabel(firm.subscriptionPlan)}</p>
          <p className="text-sm text-slate-700">{activeUsers.length} active of {includedUserLimit > 0 ? includedUserLimit : "custom"} included users</p>
        </Card>

        <Card className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Subscription status</p>
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
          {billingProvider === "stripe" ? (
            <>
              <p className="text-sm leading-6 text-slate-700">
                Stripe billing mode is configured for this environment.
              </p>
              {stripeReady ? (
                <p className="text-sm leading-6 text-slate-700">
                  Stripe customer: {firm.billingCustomerId ?? "Not linked yet"}<br />
                  Stripe subscription: {firm.billingSubscriptionId ?? "Not linked yet"}
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  Stripe keys or price IDs are missing in this environment. Billing checkout and portal links are disabled until configuration is complete.
                </p>
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
