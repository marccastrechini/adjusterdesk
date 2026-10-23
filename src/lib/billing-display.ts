import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import {
  findPublicPlanBySlug,
  findPublicPlanBySubscriptionPlan,
  listPublicPlans,
  parsePlanSlug,
  resolveFoundingStripePriceId,
  resolveStripePriceId,
  type PublicPlanSlug,
} from "@/lib/billing";
import { canStartSubscriptionForStatus } from "@/lib/billing-conversion";
import { supportEmail } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { planLabel } from "@/lib/plans";

export type CheckoutSessionShape = {
  status?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
  subscription?: string | CheckoutSubscriptionShape | null;
};

export type CheckoutSubscriptionShape = {
  status?: string | null;
  trial_start?: number | null;
  trial_end?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
        unit_amount?: number | null;
        currency?: string | null;
        recurring?: { interval?: string | null } | null;
      } | null;
    }> | null;
  } | null;
};

export type CheckoutSuccessFacts = {
  sessionFound: boolean;
  checkoutComplete: boolean;
  planSlug: PublicPlanSlug | null;
  signupSource: string | null;
  usesFoundingPrice: boolean;
  subscriptionStatus: string | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  firstChargeAmountCents: number | null;
  currency: string | null;
  interval: string | null;
  workspaceReady: boolean;
  signedIn: boolean;
};

export type SignupSuccessCopy = {
  title: string;
  paragraphs: string[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export type WorkspaceBillingSnapshot = {
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  signupSource?: string | null;
  billingSubscriptionId?: string | null;
  billingPriceId?: string | null;
  trialEndsAt?: Date | null;
  billingCurrentPeriodEnd?: Date | null;
};

export type WorkspaceBillingView = {
  statusLabel: string;
  detail: string | null;
  hasSubscription: boolean;
  showStartSubscription: boolean;
  showPendingActivationNote: boolean;
  monthlyPriceLabel: string | null;
  offerLabel: "Founding" | "Standard" | null;
  planName: string;
};

export type BillingStartPlanOption = {
  slug: PublicPlanSlug;
  label: string;
  priceLabel: string;
  includedUserLimit: number;
};

function dateFromUnix(value: number | null | undefined) {
  if (!value || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
}

export function trialLengthDays(start: Date | null, end: Date | null) {
  if (!start || !end) {
    return null;
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

export function formatRecurringAmount(cents: number, currency = "usd", interval: string | null = "month") {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

  if (interval === "year") {
    return `${formatted}/year`;
  }

  if (interval === "month" || !interval) {
    return `${formatted}/month`;
  }

  return formatted;
}

export function monthlyPriceLabelForPlan(slug: PublicPlanSlug, founding: boolean) {
  if (founding && slug === "solo") {
    return "$29/month";
  }

  if (founding && slug === "small-office") {
    return "$49/month";
  }

  return findPublicPlanBySlug(slug)?.priceLabel ?? "";
}

/**
 * Founding display follows the price actually charged when Stripe price ids
 * are configured. A founding signup source without a contradicting standard
 * price still uses the founding rate for Solo and Small Office.
 */
export function priceIsFounding(planSlug: PublicPlanSlug, priceId: string | null | undefined, signupSource: string | null | undefined) {
  if (planSlug === "team") {
    return false;
  }

  const id = priceId?.trim() || null;
  if (id) {
    const foundingId = resolveFoundingStripePriceId(planSlug);
    if (foundingId && id === foundingId) {
      return true;
    }

    const standardId = resolveStripePriceId(planSlug);
    if (standardId && id === standardId) {
      return false;
    }
  }

  return signupSource?.trim().toLowerCase() === "founding";
}

export function officeOnFoundingOffer(office: {
  subscriptionPlan: SubscriptionPlan;
  signupSource?: string | null;
  billingPriceId?: string | null;
}) {
  const plan = findPublicPlanBySubscriptionPlan(office.subscriptionPlan);
  if (!plan) {
    return false;
  }

  return priceIsFounding(plan.slug, office.billingPriceId, office.signupSource);
}

export function billingStartPlanOptions(foundingOffer: boolean): BillingStartPlanOption[] {
  return listPublicPlans().map((plan) => {
    const founding = foundingOffer && plan.slug !== "team";
    return {
      slug: plan.slug,
      label: founding ? `Founding ${plan.label}` : plan.label,
      priceLabel: monthlyPriceLabelForPlan(plan.slug, founding),
      includedUserLimit: plan.includedUserLimit,
    };
  });
}

export function describeWorkspaceBilling(office: WorkspaceBillingSnapshot): WorkspaceBillingView {
  const plan = findPublicPlanBySubscriptionPlan(office.subscriptionPlan);
  const founding = officeOnFoundingOffer(office);
  const monthlyPriceLabel = plan ? monthlyPriceLabelForPlan(plan.slug, founding) : null;
  const subscriptionId = office.billingSubscriptionId?.trim() || null;
  const hasSubscription = Boolean(subscriptionId);
  const liveSubscription = hasSubscription && office.subscriptionStatus !== SubscriptionStatus.CANCELED;
  const trialEndLabel = office.trialEndsAt ? formatDate(office.trialEndsAt) : null;
  const periodEndLabel = office.billingCurrentPeriodEnd ? formatDate(office.billingCurrentPeriodEnd) : null;

  let statusLabel = "Unknown";
  let detail: string | null = null;

  switch (office.subscriptionStatus) {
    case SubscriptionStatus.TRIAL:
      statusLabel = liveSubscription ? "Trialing" : "Trial";
      if (liveSubscription && trialEndLabel && monthlyPriceLabel) {
        detail = `Trialing until ${trialEndLabel}, then ${monthlyPriceLabel}.`;
      } else if (liveSubscription && trialEndLabel) {
        detail = `Trialing until ${trialEndLabel}.`;
      } else if (liveSubscription && monthlyPriceLabel) {
        detail = `Trialing. The first charge is ${monthlyPriceLabel} when the trial ends.`;
      } else if (trialEndLabel) {
        detail = `Trial ends ${trialEndLabel}.`;
      }
      break;
    case SubscriptionStatus.ACTIVE:
      statusLabel = "Active";
      if (monthlyPriceLabel && periodEndLabel) {
        detail = `Active at ${monthlyPriceLabel}. Current period ends ${periodEndLabel}.`;
      } else if (monthlyPriceLabel) {
        detail = `Active at ${monthlyPriceLabel}.`;
      } else if (periodEndLabel) {
        detail = `Active. Current period ends ${periodEndLabel}.`;
      } else {
        detail = "Active.";
      }
      break;
    case SubscriptionStatus.PAST_DUE:
      statusLabel = "Past due";
      detail = monthlyPriceLabel
        ? `Past due. The ${monthlyPriceLabel} subscription needs a successful payment.`
        : "Past due. The subscription needs a successful payment.";
      break;
    case SubscriptionStatus.CANCELED:
      statusLabel = "Canceled";
      detail = "Canceled. Start a subscription when this office should be billed again.";
      break;
    case SubscriptionStatus.MANUAL:
      statusLabel = "Manual";
      detail = "Manual billing. No Stripe subscription is linked.";
      break;
    default:
      statusLabel = "Unknown";
      detail = null;
  }

  return {
    statusLabel,
    detail,
    hasSubscription,
    showStartSubscription: !liveSubscription && canStartSubscriptionForStatus(office.subscriptionStatus),
    showPendingActivationNote: !liveSubscription && office.subscriptionStatus === SubscriptionStatus.TRIAL,
    monthlyPriceLabel,
    offerLabel: plan ? (founding ? "Founding" : "Standard") : null,
    planName: planLabel(office.subscriptionPlan),
  };
}

export function signupWelcomeMessage(office: WorkspaceBillingSnapshot) {
  const view = describeWorkspaceBilling(office);
  if (office.subscriptionStatus === SubscriptionStatus.TRIAL) {
    return view.detail
      ? `Your workspace is ready. ${view.detail} $0 is due until the trial ends.`
      : "Your workspace is ready. Your trial has started. $0 is due until the trial ends.";
  }

  return view.detail
    ? `Your workspace is ready. ${view.detail}`
    : "Your workspace is ready. Checkout is complete.";
}

export function emptyCheckoutFacts(extras?: Partial<CheckoutSuccessFacts>): CheckoutSuccessFacts {
  return {
    sessionFound: false,
    checkoutComplete: false,
    planSlug: null,
    signupSource: null,
    usesFoundingPrice: false,
    subscriptionStatus: null,
    trialStart: null,
    trialEnd: null,
    firstChargeAmountCents: null,
    currency: null,
    interval: null,
    workspaceReady: false,
    signedIn: false,
    ...extras,
  };
}

function checkoutLooksPaid(paymentStatus: string | null | undefined) {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

export function checkoutFactsFromStripeSession(
  session: CheckoutSessionShape | null | undefined,
  extras?: Partial<Pick<CheckoutSuccessFacts, "workspaceReady" | "signedIn">>,
): CheckoutSuccessFacts {
  if (!session) {
    return emptyCheckoutFacts(extras);
  }

  const metadata = session.metadata ?? {};
  const planSlug = parsePlanSlug(metadata.planSlug);
  const signupSource = metadata.signupSource?.trim() || null;
  const subscription = session.subscription && typeof session.subscription === "object" ? session.subscription : null;
  const price = subscription?.items?.data?.[0]?.price ?? null;
  const priceId = price?.id ?? null;

  return {
    sessionFound: true,
    checkoutComplete: session.status === "complete" && checkoutLooksPaid(session.payment_status),
    planSlug,
    signupSource,
    usesFoundingPrice: planSlug ? priceIsFounding(planSlug, priceId, signupSource) : false,
    subscriptionStatus: subscription?.status ?? null,
    trialStart: dateFromUnix(subscription?.trial_start),
    trialEnd: dateFromUnix(subscription?.trial_end),
    firstChargeAmountCents: typeof price?.unit_amount === "number" ? price.unit_amount : null,
    currency: price?.currency ?? null,
    interval: price?.recurring?.interval ?? null,
    workspaceReady: extras?.workspaceReady ?? false,
    signedIn: extras?.signedIn ?? false,
  };
}

function offerName(facts: CheckoutSuccessFacts) {
  const plan = facts.planSlug ? findPublicPlanBySlug(facts.planSlug) : null;
  if (!plan) {
    return "Your plan";
  }

  return facts.usesFoundingPrice ? `Founding ${plan.label}` : plan.label;
}

function chargeLabel(facts: CheckoutSuccessFacts) {
  if (facts.firstChargeAmountCents !== null) {
    return formatRecurringAmount(facts.firstChargeAmountCents, facts.currency ?? "usd", facts.interval);
  }

  if (facts.planSlug) {
    return monthlyPriceLabelForPlan(facts.planSlug, facts.usesFoundingPrice);
  }

  return null;
}

export function signupSuccessCopy(facts: CheckoutSuccessFacts): SignupSuccessCopy {
  const plan = facts.planSlug ? findPublicPlanBySlug(facts.planSlug) : null;
  const primaryHref = facts.signedIn ? "/today" : "/login";
  const primaryLabel = facts.workspaceReady || facts.signedIn ? "Open your office" : "Log in";
  const supportHref = `mailto:${supportEmail}`;

  if (!facts.sessionFound) {
    return {
      title: "We could not confirm checkout.",
      paragraphs: [
        plan ? `Selected plan: ${plan.label}.` : "This link did not include a completed Checkout session.",
        "If Stripe Checkout finished, log in with the email and password from signup. Your office opens once the workspace is created.",
        "Founding Solo and Small Office are a 90-day trial, then the founding monthly price. Standard plans are a 14-day trial, then the standard monthly price. $0 is due during the trial.",
        `Email ${supportEmail} if checkout finished and login does not open the office.`,
      ],
      primaryHref,
      primaryLabel: "Log in",
      secondaryHref: "/signup",
      secondaryLabel: "Back to signup",
    };
  }

  if (!facts.checkoutComplete) {
    return {
      title: "Checkout is not finished.",
      paragraphs: [
        `${offerName(facts)} was selected, and Stripe Checkout has not completed.`,
        "Return to signup to try Checkout again, or log in if this office was already created.",
        `Email ${supportEmail} if Stripe charged a card and this page still cannot confirm the session.`,
      ],
      primaryHref,
      primaryLabel: "Log in",
      secondaryHref: "/signup",
      secondaryLabel: "Back to signup",
    };
  }

  const amount = chargeLabel(facts);
  const trialEndLabel = facts.trialEnd ? formatDate(facts.trialEnd) : null;
  const trialDays = trialLengthDays(facts.trialStart, facts.trialEnd);
  const paragraphs = [`${offerName(facts)}. Checkout is complete.`];

  if (facts.subscriptionStatus === "trialing") {
    if (trialEndLabel && trialDays) {
      paragraphs.push(`Trialing until ${trialEndLabel} (${trialDays} days). $0 is due until then.`);
    } else if (trialEndLabel) {
      paragraphs.push(`Trialing until ${trialEndLabel}. $0 is due until then.`);
    } else {
      paragraphs.push("The Stripe subscription is trialing. $0 is due until the trial ends.");
    }

    if (amount && trialEndLabel) {
      paragraphs.push(`The first charge is ${amount} on ${trialEndLabel}.`);
    } else if (amount) {
      paragraphs.push(`The first charge is ${amount} when the trial ends.`);
    }
  } else if (facts.subscriptionStatus === "active") {
    paragraphs.push(amount ? `The subscription is active at ${amount}.` : "The subscription is active.");
  } else if (facts.subscriptionStatus === "past_due") {
    paragraphs.push(amount ? `The subscription is past due at ${amount}.` : "The subscription is past due.");
  } else if (facts.subscriptionStatus === "canceled") {
    paragraphs.push("The Stripe subscription is canceled.");
  } else {
    paragraphs.push("Checkout is complete. Subscription details are still syncing. Log in, or refresh this page in a moment.");
  }

  paragraphs.push(
    facts.workspaceReady
      ? "Your office is ready. Open it with the email and password from signup."
      : "Your office is still being created. Log in with the email you used at signup. If it is not ready yet, wait a moment and try again.",
  );

  return {
    title: facts.workspaceReady ? "Your office is ready." : "Checkout is complete.",
    paragraphs,
    primaryHref,
    primaryLabel,
    secondaryHref: supportHref,
    secondaryLabel: "Email support",
  };
}
