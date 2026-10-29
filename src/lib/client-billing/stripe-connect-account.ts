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
  display_name?: string | null;
  dashboard?: string | null;
  defaults?: {
    profile?: {
      doing_business_as?: string | null;
    } | null;
    responsibilities?: {
      fees_collector?: string | null;
      losses_collector?: string | null;
    } | null;
  } | null;
  configuration?: {
    merchant?: {
      statement_descriptor?: {
        descriptor?: string | null;
        prefix?: string | null;
      } | null;
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

const clientBillingConnectionStatusValues = new Set<string>(Object.values(ClientBillingConnectionStatus));

/**
 * Firm connection status is a closed enum. Legacy or Stripe-shaped values such
 * as `PENDING` are not members and must not be written — Prisma rejects them
 * and the v2 webhook would fail before readiness is saved.
 */
export function coerceClientBillingConnectionStatus(value: string | null | undefined): ClientBillingConnectionStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized && clientBillingConnectionStatusValues.has(normalized)) {
    return normalized as ClientBillingConnectionStatus;
  }

  if (normalized === "PENDING" || normalized === "INCOMPLETE" || normalized === "IN_PROGRESS") {
    return ClientBillingConnectionStatus.ONBOARDING;
  }

  return ClientBillingConnectionStatus.RESTRICTED;
}

export function clientBillingConnectionData(readiness: ClientBillingReadiness) {
  const active = isClientBillingReadinessActive(readiness);

  return {
    stripeChargesEnabled: readiness.chargesEnabled,
    stripePayoutsEnabled: readiness.payoutsEnabled,
    stripeDetailsSubmitted: readiness.detailsSubmitted,
    clientBillingConnectionStatus: coerceClientBillingConnectionStatus(
      active ? ClientBillingConnectionStatus.ACTIVE : ClientBillingConnectionStatus.RESTRICTED,
    ),
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

const stripeInvoiceNumberMaxLength = 26;
const stripeInvoiceDescriptionMaxLength = 500;
const stripeCustomFieldValueMaxLength = 140;

export type StatementDescriptor = {
  descriptor: string;
  prefix?: string;
};

/**
 * Card statements and, when no customer-facing business name is set, hosted
 * invoices fall back to a 5–22 character statement descriptor. Stripe's default
 * is a truncated platform URL, which is what showed up as "sandbox.paclaimboard.c".
 */
export function statementDescriptorFromBusinessName(name: string): StatementDescriptor | null {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>\\'"*]/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/[A-Za-z]/.test(normalized)) {
    return null;
  }

  const descriptor = normalized.slice(0, 22).trim();
  if (descriptor.length < 5 || !/[A-Za-z]/.test(descriptor)) {
    return null;
  }

  const prefix = descriptor.slice(0, 10).trim();
  if (prefix.length >= 2 && /[A-Za-z]/.test(prefix) && descriptor.startsWith(prefix)) {
    return { descriptor, prefix };
  }

  return { descriptor };
}

export function publicBusinessName(name: string) {
  const trimmed = name.trim();
  return trimmed || name;
}

function statementDescriptorParams(statement: StatementDescriptor | null) {
  if (!statement) {
    return undefined;
  }

  return {
    descriptor: statement.descriptor,
    ...(statement.prefix ? { prefix: statement.prefix } : {}),
  };
}

export function merchantAccountCreateParams(firm: { id: string; name: string; email?: string | null }): Stripe.V2.Core.AccountCreateParams {
  const email = firm.email?.trim();
  const displayName = publicBusinessName(firm.name);

  return {
    display_name: displayName,
    ...(email ? { contact_email: email } : {}),
    dashboard: connectedAccountDashboard,
    identity: {
      country: "us",
    },
    defaults: {
      currency: "usd",
      profile: {
        doing_business_as: displayName,
      },
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

/**
 * Full-dashboard accounts that pay Stripe's fees are onboarded with an Account
 * Link or Account Session. Stripe rejects platform writes to
 * `configuration.merchant.statement_descriptor` on those accounts with a 403
 * permission error. The connected account sets that descriptor in its own Dashboard.
 */
export function platformCanWriteMerchantStatementDescriptor(account: V2ConnectedAccountSnapshot) {
  const feesCollector = account.defaults?.responsibilities?.fees_collector;
  return !(account.dashboard === connectedAccountDashboard && feesCollector === connectedAccountFeesCollector);
}

/**
 * Hosted direct-charge invoices copy `account_name` from the connected account's
 * customer-facing business name (`doing_business_as` on v2, `business_profile.name`
 * on v1). `display_name` is the Dashboard label and the name on invoices sent to
 * the account itself, so both are set. Statement descriptors are included only
 * when the platform is allowed to write them. Responsibilities are not resent.
 */
export function v2PublicBusinessNameUpdateParams(account: V2ConnectedAccountSnapshot, name: string): Stripe.V2.Core.AccountUpdateParams | null {
  const displayName = publicBusinessName(name);
  if (!displayName.trim()) {
    return null;
  }

  const params: Stripe.V2.Core.AccountUpdateParams = {};
  const statement = statementDescriptorFromBusinessName(displayName);
  const currentDescriptor = account.configuration?.merchant?.statement_descriptor;

  if (account.display_name !== displayName) {
    params.display_name = displayName;
  }

  if (account.defaults?.profile?.doing_business_as !== displayName) {
    params.defaults = {
      profile: {
        doing_business_as: displayName,
      },
    };
  }

  if (
    platformCanWriteMerchantStatementDescriptor(account) &&
    statement &&
    (currentDescriptor?.descriptor !== statement.descriptor || (statement.prefix ? currentDescriptor?.prefix !== statement.prefix : false))
  ) {
    params.configuration = {
      merchant: {
        statement_descriptor: statementDescriptorParams(statement),
      },
    };
  }

  if (!params.display_name && !params.defaults && !params.configuration) {
    return null;
  }

  return params;
}

export function v2BusinessNameOnlyUpdateParams(account: V2ConnectedAccountSnapshot, name: string): Stripe.V2.Core.AccountUpdateParams | null {
  const displayName = publicBusinessName(name);
  if (!displayName.trim()) {
    return null;
  }

  const params: Stripe.V2.Core.AccountUpdateParams = {};

  if (account.display_name !== displayName) {
    params.display_name = displayName;
  }

  if (account.defaults?.profile?.doing_business_as !== displayName) {
    params.defaults = {
      profile: {
        doing_business_as: displayName,
      },
    };
  }

  if (!params.display_name && !params.defaults) {
    return null;
  }

  return params;
}

export function v1PublicBusinessNameUpdateParams(name: string): Stripe.AccountUpdateParams {
  const displayName = publicBusinessName(name);
  const statement = statementDescriptorFromBusinessName(displayName);

  return {
    business_profile: {
      name: displayName,
    },
    ...(statement
      ? {
          settings: {
            payments: {
              statement_descriptor: statement.descriptor,
            },
            ...(statement.prefix
              ? {
                  card_payments: {
                    statement_descriptor_prefix: statement.prefix,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}

export function v1BusinessProfileNameParams(name: string): Stripe.AccountUpdateParams {
  return {
    business_profile: {
      name: publicBusinessName(name),
    },
  };
}

export function insuredDisplayName(contact: { firstName?: string | null; lastName?: string | null; company?: string | null }) {
  const person = [contact.firstName, contact.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return person || contact.company?.trim() || "";
}

export function stableDaysUntilDue(invoice: { dueAt?: Date | string | null; issuedAt?: Date | string | null }) {
  if (!invoice.dueAt || !invoice.issuedAt) {
    return 14;
  }

  const days = Math.ceil((new Date(invoice.dueAt).getTime() - new Date(invoice.issuedAt).getTime()) / 86_400_000);
  if (!Number.isFinite(days)) {
    return 14;
  }

  return Math.max(days, 1);
}

export function hostedInvoicePresentation(input: { invoiceNumber: string; claimNumber?: string | null; insuredName?: string | null }) {
  const invoiceNumber = input.invoiceNumber.trim();
  const claimNumber = input.claimNumber?.trim() ?? "";
  const insuredName = input.insuredName?.trim() ?? "";
  const customFields: Stripe.InvoiceCreateParams.CustomField[] = [];

  if (invoiceNumber) {
    customFields.push({ name: "Invoice #", value: invoiceNumber.slice(0, stripeCustomFieldValueMaxLength) });
  }

  if (claimNumber) {
    customFields.push({ name: "Claim #", value: claimNumber.slice(0, stripeCustomFieldValueMaxLength) });
  }

  if (insuredName) {
    customFields.push({ name: "Insured", value: insuredName.slice(0, stripeCustomFieldValueMaxLength) });
  }

  const descriptionParts = [`Client fee invoice ${invoiceNumber || "invoice"}`];
  if (insuredName) {
    descriptionParts.push(`for ${insuredName}`);
  }
  if (claimNumber) {
    descriptionParts.push(`claim ${claimNumber}`);
  }

  return {
    number: invoiceNumber.length >= 1 && invoiceNumber.length <= stripeInvoiceNumberMaxLength ? invoiceNumber : undefined,
    description: descriptionParts.join(" · ").slice(0, stripeInvoiceDescriptionMaxLength),
    custom_fields: customFields,
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

export function isStatementDescriptorPermissionError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { type?: string; rawType?: string; statusCode?: number; message?: string };
  const message = candidate.message ?? "";
  if (!message.includes("statement_descriptor")) {
    return false;
  }

  return candidate.statusCode === 403 || candidate.type === "StripePermissionError" || candidate.rawType === "permission_error";
}

type StripeId = string | { id?: string | null } | null | undefined;

function stripeId(value: StripeId) {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : value.id ?? undefined;
}

export type InvoicePaymentSnapshot = {
  status?: string | null;
  is_default?: boolean | null;
  payment?: {
    type?: string | null;
    payment_intent?: StripeId;
    charge?: StripeId;
  } | null;
};

export type InvoicePaymentRefs = {
  paymentIntentId?: string;
  chargeId?: string;
};

/**
 * Current invoice API versions no longer return `payment_intent` or `charge`.
 * Those ids live on `invoice.payments` (Invoice Payment objects).
 */
export function paymentRefsFromInvoicePayments(payments: { data?: InvoicePaymentSnapshot[] | null } | null | undefined): InvoicePaymentRefs {
  const entries = [...(payments?.data ?? [])].sort((left, right) => paymentEntryRank(right) - paymentEntryRank(left));
  let paymentIntentId: string | undefined;
  let chargeId: string | undefined;

  for (const entry of entries) {
    paymentIntentId ??= stripeId(entry.payment?.payment_intent);
    chargeId ??= stripeId(entry.payment?.charge);
    if (paymentIntentId && chargeId) {
      break;
    }
  }

  return { paymentIntentId, chargeId };
}

function paymentEntryRank(entry: InvoicePaymentSnapshot) {
  let rank = 0;
  if (entry.status === "paid") {
    rank += 4;
  }
  if (entry.is_default) {
    rank += 2;
  }
  if (entry.payment?.type === "payment_intent" || stripeId(entry.payment?.payment_intent)) {
    rank += 1;
  }
  return rank;
}

export function paymentRefsFromInvoice(invoice: {
  payment_intent?: StripeId;
  charge?: StripeId;
  payments?: { data?: InvoicePaymentSnapshot[] | null } | null;
}): InvoicePaymentRefs {
  const fromPayments = paymentRefsFromInvoicePayments(invoice.payments);

  return {
    paymentIntentId: fromPayments.paymentIntentId ?? stripeId(invoice.payment_intent),
    chargeId: fromPayments.chargeId ?? stripeId(invoice.charge),
  };
}

export async function resolveInvoicePaymentRefs(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  options?: { stripeAccount?: string | null; listIfMissing?: boolean },
): Promise<InvoicePaymentRefs> {
  const inline = paymentRefsFromInvoice(invoice);
  if (inline.paymentIntentId || !invoice.id || options?.listIfMissing === false) {
    return inline;
  }

  try {
    const listed = await stripe.invoicePayments.list(
      { invoice: invoice.id, limit: 10 },
      options?.stripeAccount ? { stripeAccount: options.stripeAccount } : undefined,
    );
    const fromList = paymentRefsFromInvoicePayments(listed);

    return {
      paymentIntentId: fromList.paymentIntentId ?? inline.paymentIntentId,
      chargeId: fromList.chargeId ?? inline.chargeId,
    };
  } catch (error) {
    logClientBillingStripeError("Could not list invoice payments for the PaymentIntent id.", error);
    return inline;
  }
}
