import { openBillingPortalForCurrentWorkspace } from "@/lib/billing-actions";
import { getStripeConfigDiagnostics, listPublicPlans, resolveBillingProvider, stripeConfigured } from "@/lib/billing";
import { startSubscriptionForCurrentWorkspace } from "@/lib/billing-actions";
import { formatDate } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { planLabel, resolveIncludedUserLimit, subscriptionStatusLabel } from "@/lib/plans";
import { getUsers } from "@/lib/queries";
import { Badge, Card, Notice, PageHeader, Section, SubmitButton } from "@/components/ui";
import { trialDaysRemaining, trialPromptState } from "@/lib/trial";
import { selectClassName } from "@/components/ui";

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
  const trialState = trialPromptState(firm);
  const trialDays = firm.trialEndsAt ? trialDaysRemaining(firm.trialEndsAt) : null;
  const isOnTrial = firm.subscriptionStatus === "TRIAL";
  const canSubscribe = billingProvider === "stripe" && stripeReady && isOnTrial;
  const plans = listPublicPlans();

  return (
    <>
      <PageHeader
        title="Billing"
        description="Current plan, active users included, billing status, and billing timing for this workspace."
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      {trialState !== "none" && trialState !== "comfortable" ? (
        <Card className={`grid gap-3 ${trialState === "expired" ? "border-red-200 bg-red-50" : trialState === "ending-imminent" ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
          {trialState === "expired" ? (
            <>
              <p className="font-semibold text-slate-950">Your free trial has ended.</p>
              <p className="text-sm leading-6 text-slate-700">Choose a plan below to continue using AdjusterDesk. Your data and settings are preserved.</p>
            </>
          ) : (
            <p className="text-sm leading-6 text-slate-700">
              {trialDays !== null && trialDays >= 0
                ? `Your free trial ends in ${trialDays === 1 ? "1 day" : `${trialDays} days`}.`
                : "Your free trial ends soon."}
              {" "}Choose a plan when you are ready.
            </p>
          )}
        </Card>
      ) : null}

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
          {isOnTrial && firm.trialEndsAt ? (
            <p className="text-sm text-slate-500">Trial ends: {formatDate(firm.trialEndsAt)}</p>
          ) : null}
        </Card>
      </div>

      {canSubscribe ? (
        <Section title="Start subscription">
          <Card className="grid gap-4">
            <p className="text-sm leading-6 text-slate-700">
              Choose the plan that fits your office and start a paid subscription through Stripe. No card is required until you choose to subscribe.
            </p>
            <form
              action={async (formData: FormData) => {
                "use server";
                const plan = formData.get("plan")?.toString() ?? "";
                await startSubscriptionForCurrentWorkspace(plan);
              }}
              className="grid gap-4 sm:grid-cols-[1fr_auto]"
            >
              <select name="plan" defaultValue={firm.subscriptionPlan.toLowerCase().replace("_", "-")} className={selectClassName}>
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.label} — {p.priceLabel} ({p.includedUserLimit} user{p.includedUserLimit === 1 ? "" : "s"})
                  </option>
                ))}
              </select>
              <SubmitButton>Start subscription</SubmitButton>
            </form>
          </Card>
        </Section>
      ) : null}

      <Section title="Billing details">
        <Card className="grid gap-3">
          <p className="text-sm leading-6 text-slate-700">No credit card is required to start your trial. Billing starts only when you choose a plan.</p>
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
