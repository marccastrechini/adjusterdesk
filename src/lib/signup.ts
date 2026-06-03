import type Stripe from "stripe";
import { SubscriptionStatus, UserRole, type Prisma } from "@/generated/prisma/client";
import {
  defaultLimitForPlan,
  findPublicPlanBySlug,
  findPublicPlanBySubscriptionPlan,
  logStripeConfigIssue,
  mapStripeSubscriptionStatus,
  resolveBillingProvider,
  resolveStripePriceId,
  stripeConfigured,
  type PublicPlanSlug,
} from "@/lib/billing";
import { resolveAppBaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireStripeClient, requireStripePriceId } from "@/lib/stripe";
import { trialEndDate } from "@/lib/trial";

export type SignupIntentInput = {
  planSlug: PublicPlanSlug;
  firmName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  passwordHash: string;
};

function toDateFromUnix(value: number | null | undefined) {
  if (!value || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
}

function checkoutLooksPaid(paymentStatus: string | null | undefined) {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

export function canReuseOpenCheckoutSession(session: { status?: string | null; url?: string | null } | null | undefined) {
  return Boolean(session?.url && session.status === "open");
}

export function buildStripeCheckoutSessionParams(params: {
  intent: {
    id: string;
    ownerEmail: string;
    ownerName: string;
    firmName: string;
    ownerPhone?: string | null;
  };
  planSlug: PublicPlanSlug;
  appBaseUrl: string;
  priceId: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    success_url: `${params.appBaseUrl}/signup/success?plan=${params.planSlug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.appBaseUrl}/signup/cancel?intent=${encodeURIComponent(params.intent.id)}`,
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer_email: params.intent.ownerEmail,
    client_reference_id: params.intent.id,
    metadata: {
      signupIntentId: params.intent.id,
      planSlug: params.planSlug,
      workspaceName: params.intent.firmName,
      ownerName: params.intent.ownerName,
      ownerPhone: params.intent.ownerPhone ?? "",
    },
    subscription_data: {
      metadata: {
        signupIntentId: params.intent.id,
        planSlug: params.planSlug,
      },
    },
    allow_promotion_codes: true,
  };
}

export async function createSignupIntent(input: SignupIntentInput) {
  const plan = findPublicPlanBySlug(input.planSlug);
  if (!plan) {
    throw new Error("Invalid plan selection.");
  }

  return prisma.signupIntent.create({
    data: {
      plan: plan.plan,
      billingProvider: resolveBillingProvider(),
      firmName: input.firmName,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      ownerPhone: input.ownerPhone,
      passwordHash: input.passwordHash,
      termsAcceptedAt: new Date(),
      source: "public-signup",
    },
  });
}

export async function createStripeCheckoutSessionForIntent(intentId: string, planSlug: PublicPlanSlug) {
  if (!stripeConfigured()) {
    logStripeConfigIssue("createStripeCheckoutSessionForIntent");
    throw new Error("Stripe is not configured.");
  }

  const stripe = requireStripeClient();
  const intent = await prisma.signupIntent.findUnique({
    where: { id: intentId },
    select: {
      id: true,
      ownerEmail: true,
      ownerName: true,
      firmName: true,
      ownerPhone: true,
      stripeCheckoutSessionId: true,
      status: true,
    },
  });

  if (!intent) {
    throw new Error("Signup request not found.");
  }

  if (intent.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(intent.stripeCheckoutSessionId);
    if (canReuseOpenCheckoutSession(existing)) {
      return existing;
    }
  }

  const priceId = requireStripePriceId(planSlug);
  const appBaseUrl = resolveAppBaseUrl();
  const session = await stripe.checkout.sessions.create(
    buildStripeCheckoutSessionParams({
      intent,
      planSlug,
      appBaseUrl,
      priceId,
    }),
  );

  await prisma.signupIntent.update({
    where: { id: intent.id },
    data: {
      stripeCheckoutSessionId: session.id,
      stripePriceId: resolveStripePriceId(planSlug),
    },
  });

  return session;
}

async function createWorkspaceAndOwnerFromIntent(params: {
  tx: Prisma.TransactionClient;
  intentId: string;
  subscriptionStatus: SubscriptionStatus;
  billingCustomerId?: string | null;
  billingSubscriptionId?: string | null;
  billingPriceId?: string | null;
  billingCurrentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
}) {
  const intent = await params.tx.signupIntent.findUnique({
    where: { id: params.intentId },
  });

  if (!intent) {
    throw new Error("Signup intent missing.");
  }

  if (intent.status === "COMPLETED" && intent.completedFirmId && intent.completedOwnerUserId) {
    return {
      firmId: intent.completedFirmId,
      ownerUserId: intent.completedOwnerUserId,
    };
  }

  const lockIntent = await params.tx.signupIntent.updateMany({
    where: {
      id: intent.id,
      status: {
        in: ["PENDING", "CHECKOUT_COMPLETED"],
      },
    },
    data: {
      status: "CHECKOUT_COMPLETED",
      stripeCustomerId: params.billingCustomerId ?? intent.stripeCustomerId,
      stripeSubscriptionId: params.billingSubscriptionId ?? intent.stripeSubscriptionId,
      stripePriceId: params.billingPriceId ?? intent.stripePriceId,
    },
  });

  if (lockIntent.count !== 1) {
    const completedIntent = await params.tx.signupIntent.findUnique({
      where: { id: intent.id },
      select: { completedFirmId: true, completedOwnerUserId: true, status: true },
    });

    if (completedIntent?.status === "COMPLETED" && completedIntent.completedFirmId && completedIntent.completedOwnerUserId) {
      return {
        firmId: completedIntent.completedFirmId,
        ownerUserId: completedIntent.completedOwnerUserId,
      };
    }

    throw new Error("Signup request is already being processed.");
  }

  const duplicateUser = await params.tx.user.findUnique({
    where: { email: intent.ownerEmail },
    select: { id: true },
  });

  if (duplicateUser) {
    throw new Error("A user with this email already exists.");
  }

  const plan = findPublicPlanBySubscriptionPlan(intent.plan);
  if (!plan) {
    throw new Error("Plan is no longer available for self-service.");
  }

  const firm = await params.tx.firm.create({
    data: {
      name: intent.firmName,
      email: intent.ownerEmail,
      phone: intent.ownerPhone,
      subscriptionPlan: intent.plan,
      subscriptionStatus: params.subscriptionStatus,
      includedUserLimit: defaultLimitForPlan(intent.plan),
      trialEndsAt: params.trialEndsAt ?? undefined,
      billingStartedAt: new Date(),
      billingCustomerId: params.billingCustomerId ?? undefined,
      billingSubscriptionId: params.billingSubscriptionId ?? undefined,
      billingPriceId: params.billingPriceId ?? undefined,
      billingCurrentPeriodEnd: params.billingCurrentPeriodEnd ?? undefined,
      signupSource: intent.source ?? "public-signup",
    },
  });

  const owner = await params.tx.user.create({
    data: {
      firmId: firm.id,
      name: intent.ownerName,
      email: intent.ownerEmail,
      passwordHash: intent.passwordHash,
      role: UserRole.OWNER,
      active: true,
    },
  });

  await params.tx.signupIntent.update({
    where: { id: intent.id },
    data: {
      status: "COMPLETED",
      completedFirmId: firm.id,
      completedOwnerUserId: owner.id,
    },
  });

  return {
    firmId: firm.id,
    ownerUserId: owner.id,
    planSlug: plan.slug,
  };
}

export async function provisionManualSignup(intentId: string) {
  return prisma.$transaction((tx) =>
    createWorkspaceAndOwnerFromIntent({
      tx,
      intentId,
      subscriptionStatus: SubscriptionStatus.MANUAL,
    }),
  );
}

export type TrialSignupInput = {
  planSlug: PublicPlanSlug;
  firmName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  passwordHash: string;
};

/**
 * Creates a workspace and owner user on a free trial.
 * No Stripe Checkout is triggered. Workspace is created immediately.
 */
export async function provisionTrialSignup(input: TrialSignupInput) {
  const plan = findPublicPlanBySlug(input.planSlug);
  if (!plan) {
    throw new Error("Invalid plan selection.");
  }

  const now = new Date();
  const trialEnds = trialEndDate(now);

  return prisma.$transaction(async (tx) => {
    const duplicateUser = await tx.user.findUnique({
      where: { email: input.ownerEmail },
      select: { id: true },
    });

    if (duplicateUser) {
      throw new Error("A user with this email already exists.");
    }

    const firm = await tx.firm.create({
      data: {
        name: input.firmName,
        email: input.ownerEmail,
        phone: input.ownerPhone,
        subscriptionPlan: plan.plan,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        includedUserLimit: defaultLimitForPlan(plan.plan),
        trialStartedAt: now,
        trialEndsAt: trialEnds,
        signupSource: "public-signup",
      },
    });

    const owner = await tx.user.create({
      data: {
        firmId: firm.id,
        name: input.ownerName,
        email: input.ownerEmail,
        passwordHash: input.passwordHash,
        role: UserRole.OWNER,
        active: true,
      },
    });

    return { firmId: firm.id, ownerUserId: owner.id, planSlug: input.planSlug };
  });
}

export async function completeStripeSignupFromSessionId(sessionId: string) {
  if (!stripeConfigured()) {
    logStripeConfigIssue("completeStripeSignupFromSessionId");
    throw new Error("Stripe is not configured.");
  }

  const stripe = requireStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const intentId = session.metadata?.signupIntentId ?? session.client_reference_id ?? undefined;
  if (!intentId) {
    throw new Error("Missing signup session metadata.");
  }

  if (session.status !== "complete") {
    throw new Error("Checkout is not complete yet.");
  }

  if (!checkoutLooksPaid(session.payment_status)) {
    throw new Error("Checkout payment is not complete yet.");
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    throw new Error("Subscription was not created.");
  }

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (!subscription) {
    throw new Error("Subscription could not be loaded.");
  }

  const firstItem = subscription.items.data[0];
  const periodEnd = toDateFromUnix(firstItem?.current_period_end);
  const trialEnd = toDateFromUnix(subscription.trial_end);
  const priceId = firstItem?.price?.id ?? session.metadata?.priceId ?? null;

  return prisma.$transaction((tx) =>
    createWorkspaceAndOwnerFromIntent({
      tx,
      intentId,
      subscriptionStatus: mapStripeSubscriptionStatus(subscription.status),
      billingCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      billingSubscriptionId: subscription.id,
      billingPriceId: priceId,
      billingCurrentPeriodEnd: periodEnd,
      trialEndsAt: trialEnd,
    }),
  );
}

export async function markSignupIntentCanceled(intentId: string) {
  await prisma.signupIntent.updateMany({
    where: {
      id: intentId,
      status: {
        in: ["PENDING", "CHECKOUT_COMPLETED"],
      },
    },
    data: {
      status: "CANCELED",
    },
  });
}
