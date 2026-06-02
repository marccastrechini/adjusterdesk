import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { defaultIncludedUserLimit } from "@/lib/plans";

export type PublicPlanSlug = "solo" | "small-office" | "team";
export type BillingProvider = "manual" | "stripe";

export const STRIPE_REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_SOLO_MONTHLY",
  "STRIPE_PRICE_SMALL_OFFICE_MONTHLY",
  "STRIPE_PRICE_TEAM_MONTHLY",
] as const;

export type StripeConfigDiagnostics = {
  ready: boolean;
  missingVars: string[];
  warnings: string[];
};

export type PublicPlanDefinition = {
  slug: PublicPlanSlug;
  plan: SubscriptionPlan;
  label: string;
  priceLabel: string;
  includedUserLimit: number;
};

const publicPlans: PublicPlanDefinition[] = [
  {
    slug: "solo",
    plan: SubscriptionPlan.SOLO,
    label: "Solo",
    priceLabel: "$49/month",
    includedUserLimit: 1,
  },
  {
    slug: "small-office",
    plan: SubscriptionPlan.SMALL_OFFICE,
    label: "Small Office",
    priceLabel: "$99/month",
    includedUserLimit: 3,
  },
  {
    slug: "team",
    plan: SubscriptionPlan.TEAM,
    label: "Team",
    priceLabel: "$199/month",
    includedUserLimit: 7,
  },
];

function envBool(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function listPublicPlans() {
  return publicPlans;
}

export function findPublicPlanBySlug(slug: string | undefined | null) {
  if (!slug) {
    return null;
  }

  return publicPlans.find((plan) => plan.slug === slug) ?? null;
}

export function findPublicPlanBySubscriptionPlan(plan: SubscriptionPlan) {
  return publicPlans.find((entry) => entry.plan === plan) ?? null;
}

export function resolveIncludedUserLimitForPublicPlan(slug: PublicPlanSlug) {
  const match = findPublicPlanBySlug(slug);
  return match ? match.includedUserLimit : 0;
}

export function resolveBillingProvider(): BillingProvider {
  const configured = process.env.BILLING_PROVIDER?.trim().toLowerCase();
  return configured === "stripe" ? "stripe" : "manual";
}

export function selfServiceSignupEnabled() {
  return envBool("SELF_SERVICE_SIGNUP_ENABLED", false);
}

export function stripeCoreConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function stripePricingConfigured() {
  return Boolean(
    process.env.STRIPE_PRICE_SOLO_MONTHLY?.trim() &&
      process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY?.trim() &&
      process.env.STRIPE_PRICE_TEAM_MONTHLY?.trim(),
  );
}

export function stripeConfigured() {
  return stripeCoreConfigured() && stripePricingConfigured();
}

export function getStripeConfigDiagnostics(): StripeConfigDiagnostics {
  const missingVars = STRIPE_REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim());
  const warnings: string[] = [];

  if (!process.env.APP_BASE_URL?.trim()) {
    warnings.push("APP_BASE_URL is not set. Stripe redirects will use the environment fallback base URL.");
  }

  return {
    ready: missingVars.length === 0,
    missingVars,
    warnings,
  };
}

const loggedStripeConfigContexts = new Set<string>();

export function logStripeConfigIssue(context: string) {
  if (resolveBillingProvider() !== "stripe") {
    return;
  }

  const diagnostics = getStripeConfigDiagnostics();
  if (diagnostics.ready) {
    return;
  }

  const dedupeKey = `${context}:${diagnostics.missingVars.join(",")}:${diagnostics.warnings.join(",")}`;
  if (loggedStripeConfigContexts.has(dedupeKey)) {
    return;
  }

  loggedStripeConfigContexts.add(dedupeKey);
  console.warn(
    `[billing] Stripe mode is enabled but configuration is incomplete in ${context}. Missing vars: ${diagnostics.missingVars.join(", ") || "none"}. Warnings: ${diagnostics.warnings.join(" | ") || "none"}.`,
  );
}

export function publicSelfServiceReady() {
  if (!selfServiceSignupEnabled()) {
    return false;
  }

  if (resolveBillingProvider() === "manual") {
    return true;
  }

  return stripeConfigured();
}

export function resolvePublicStartHref(planSlug?: PublicPlanSlug) {
  return planSlug ? `/signup?plan=${planSlug}` : "/signup";
}

export function resolvePublicStartLabel(planSlug?: PublicPlanSlug) {
  if (planSlug) {
    const plan = findPublicPlanBySlug(planSlug);
    if (plan) {
      return `Start ${plan.label}`;
    }
  }

  return "Start using AdjusterDesk";
}

export function resolveStripePriceId(planSlug: PublicPlanSlug) {
  if (planSlug === "solo") {
    return process.env.STRIPE_PRICE_SOLO_MONTHLY?.trim() ?? "";
  }

  if (planSlug === "small-office") {
    return process.env.STRIPE_PRICE_SMALL_OFFICE_MONTHLY?.trim() ?? "";
  }

  return process.env.STRIPE_PRICE_TEAM_MONTHLY?.trim() ?? "";
}

export function mapStripeSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return SubscriptionStatus.TRIAL;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.MANUAL;
  }
}

export function defaultLimitForPlan(plan: SubscriptionPlan) {
  return defaultIncludedUserLimit(plan) ?? 0;
}
