import { ClientBillingConnectionStatus } from "@/generated/prisma/client";
import type Stripe from "stripe";

/**
 * New offices bill their own clients with direct charges and no application fee.
 * Legacy Express accounts use fee payer `application_express`, so the connected
 * account pays card processing fees. Accounts v2 expresses that as
 * `fees_collector: "stripe"`. An Express dashboard cannot be paired with that
 * fee collector (`account_controller_express_dash_without_application_losses_or_fees`),
 * and `losses_collector: "application"` would force the platform to pay fees too.
 * New accounts therefore use the full Stripe Dashboard, with Stripe collecting
 * fees and covering negative balances. Hosted onboarding is still an account link.
 * Existing v1 Express accounts stay on the v1 account-link and retrieve APIs.
 */
export const connectedAccountDashboard = "full" as const;
export const connectedAccountFeesCollector = "stripe" as const;
export const connectedAccountLossesCollector = "stripe" as const;

export type ClientBillingReadiness = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type V2ConnectedAccountSnapshot = {
  id?: string;
  dashboard?: string | null;
  defaults?: {
    responsibilities?: {
      fees_collector?: string | null;
      losses_collector?: string | null;
    } | null;
  } | null;
  configuration?: {
    merchant?: {
      capabilities?: {
        card_payments?: { status?: string | null } | null;
        stripe_balance?: {
          payouts?: { status?: string | null } | null;
        } | null;
      } | null;
    } | null;
  } | null;
  requirements?: {
    entries?: Array<{
      awaiting_action_from?: string | null;
      minimum_deadline?: { status?: string | null } | null;
    }> | null;
  } | null;
};

const blockingRequirementStatuses = new Set(["currently_due", "past_due"]);

export const v2ConnectedAccountEventTypes = new Set([
  "v2.core.account.updated",
  "v2.core.account[configuration.merchant].updated",
  "v2.core.account[configuration.merchant].capability_status_updated",
  "v2.core.account[requirements].updated",
]);

export function isClientBillingReadinessActive(readiness: ClientBillingReadiness) {
  return readiness.chargesEnabled && readiness.payoutsEnabled && readiness.detailsSubmitted;
}

export function clientBillingConnectionData(readiness: ClientBillingReadiness) {
  const active = isClientBillingReadinessActive(readiness);

  return {
    stripeChargesEnabled: readiness.chargesEnabled,
    stripePayoutsEnabled: readiness.payoutsEnabled,
    stripeDetailsSubmitted: readiness.detailsSubmitted,
    clientBillingConnectionStatus: active ? ClientBillingConnectionStatus.ACTIVE : ClientBillingConnectionStatus.RESTRICTED,
    clientBillingEnabled: active,
  };
}

export function clientBillingReadinessFromV1Account(account: {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
}): ClientBillingReadiness {
  return {
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
}

export function clientBillingReadinessFromV2Account(account: V2ConnectedAccountSnapshot): ClientBillingReadiness | null {
  const cardStatus = account.configuration?.merchant?.capabilities?.card_payments?.status;
  const payoutStatus = account.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status;

  if (!cardStatus && !payoutStatus) {
    return null;
  }

  const chargesEnabled = cardStatus === "active";
  const payoutsEnabled = payoutStatus === "active";
  const entries = account.requirements?.entries;
  let detailsSubmitted = false;

  if (entries && entries.length > 0) {
    const waitingOnUser = entries.some((entry) => {
      const status = entry.minimum_deadline?.status;
      if (!status || !blockingRequirementStatuses.has(status)) {
        return false;
      }

      return entry.awaiting_action_from !== "stripe";
    });
    detailsSubmitted = !waitingOnUser;
  } else if (chargesEnabled && payoutsEnabled) {
    detailsSubmitted = true;
  }

  return { chargesEnabled, payoutsEnabled, detailsSubmitted };
}

export function isLegacyExpressConnectedAccount(account: V2ConnectedAccountSnapshot) {
  const feesCollector = account.defaults?.responsibilities?.fees_collector;
  return account.dashboard === "express" || feesCollector === "application_express" || feesCollector === "application_custom";
}

export function merchantAccountCreateParams(firm: { id: string; name: string; email?: string | null }): Stripe.V2.Core.AccountCreateParams {
  const email = firm.email?.trim();

  return {
    display_name: firm.name,
    ...(email ? { contact_email: email } : {}),
    dashboard: connectedAccountDashboard,
    identity: {
      country: "us",
    },
    defaults: {
      currency: "usd",
      responsibilities: {
        fees_collector: connectedAccountFeesCollector,
        losses_collector: connectedAccountLossesCollector,
      },
    },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: {
            requested: true,
          },
        },
      },
    },
    metadata: {
      firmId: firm.id,
    },
    include: ["configuration.merchant", "defaults", "requirements"],
  };
}

export function clientPaymentsReturnUrl(baseUrl: string) {
  return `${baseUrl}/settings/client-payments`;
}

export function v2OnboardingLinkParams(accountId: string, baseUrl: string): Stripe.V2.Core.AccountLinkCreateParams {
  const returnUrl = clientPaymentsReturnUrl(baseUrl);

  return {
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        collection_options: {
          fields: "eventually_due",
        },
        refresh_url: returnUrl,
        return_url: returnUrl,
      },
    },
  };
}

export function v1OnboardingLinkParams(accountId: string, baseUrl: string): Stripe.AccountLinkCreateParams {
  const returnUrl = clientPaymentsReturnUrl(baseUrl);

  return {
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  };
}

const secretPattern = /\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._\-]+/gi;

export function redactClientBillingLogText(value: string) {
  return value.replace(secretPattern, (match) => (match.toLowerCase().startsWith("bearer ") ? "Bearer [redacted]" : "[redacted]"));
}

export function clientBillingStripeErrorLogFields(error: unknown) {
  if (typeof error === "object" && error !== null && "rawType" in error) {
    const stripeError = error as {
      type?: string;
      rawType?: string;
      code?: string;
      statusCode?: number;
      requestId?: string;
      message?: string;
    };

    return {
      type: stripeError.rawType || stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
      requestId: stripeError.requestId,
      message: redactClientBillingLogText(stripeError.message ?? "").slice(0, 500),
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    message: redactClientBillingLogText(message).slice(0, 500),
  };
}

export function logClientBillingStripeError(context: string, error: unknown) {
  console.error(`[client-billing] ${context}`, clientBillingStripeErrorLogFields(error));
}
