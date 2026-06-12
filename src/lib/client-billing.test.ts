import assert from "node:assert/strict";
import { test } from "node:test";
import { createManualClientBillingProvider } from "@/lib/client-billing/manual-provider";
import { calculateClientPaymentFeeRecoveryCents } from "@/lib/client-billing/fee-recovery";
import { createOrResumeStripeConnectClientBillingConnection, getClientBillingProviderName, stripeConnectClientPaymentsEnabled } from "@/lib/client-billing/provider";
import { getClientPaymentsPrimaryActionLabel } from "@/lib/client-billing/ui";

test("client billing defaults to manual provider", () => {
  const providerName = getClientBillingProviderName({ clientBillingProvider: "MANUAL" } as never);
  assert.equal(providerName, "manual");
  assert.equal(createManualClientBillingProvider().isReady({} as never), false);
});

test("fee recovery defaults off until enabled and acknowledged", () => {
  const disabled = calculateClientPaymentFeeRecoveryCents(
    {
      clientPaymentFeeEnabled: false,
      clientPaymentFeeAcknowledgedAt: null,
      clientPaymentFeeBasisPoints: 300,
      clientPaymentFeeFixedCents: 250,
    } as never,
    10_000,
  );

  const missingAck = calculateClientPaymentFeeRecoveryCents(
    {
      clientPaymentFeeEnabled: true,
      clientPaymentFeeAcknowledgedAt: null,
      clientPaymentFeeBasisPoints: 300,
      clientPaymentFeeFixedCents: 250,
    } as never,
    10_000,
  );

  const enabled = calculateClientPaymentFeeRecoveryCents(
    {
      clientPaymentFeeEnabled: true,
      clientPaymentFeeAcknowledgedAt: new Date(),
      clientPaymentFeeBasisPoints: 300,
      clientPaymentFeeFixedCents: 250,
    } as never,
    10_000,
  );

  assert.equal(disabled, 0);
  assert.equal(missingAck, 0);
  assert.equal(enabled, 550);
});

test("manual-mode firm can start Stripe Connect onboarding through explicit Stripe provider path", async () => {
  let called = false;
  const manualModeFirm = {
    id: "firm_manual",
    clientBillingProvider: "MANUAL",
    stripeConnectAccountId: null,
  } as never;

  const result = await createOrResumeStripeConnectClientBillingConnection(manualModeFirm, {
    provider: {
      getConnectionStatus() {
        throw new Error("not needed");
      },
      async createOrResumeConnection() {
        called = true;
        return { url: "https://connect.stripe.test/onboarding/session_123" };
      },
      async refreshConnectionStatus() {
        throw new Error("not needed");
      },
      isReady() {
        return false;
      },
      async createOrUpdateCustomer() {
        return {};
      },
      async sendInvoice() {
        return {};
      },
      async syncInvoiceStatus() {
        return {};
      },
      handleWebhook() {
        return;
      },
    },
    env: {
      STRIPE_SECRET_KEY: "sk_test_123",
      CLIENT_BILLING_PROVIDERS_ENABLED: "manual,stripe_connect",
      STRIPE_CONNECT_CLIENT_PAYMENTS_ENABLED: "true",
    } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(called, true);
  assert.equal(result?.url, "https://connect.stripe.test/onboarding/session_123");
});

test("incomplete Stripe account can resume onboarding through explicit Stripe provider path", async () => {
  let seenAccountId: string | null = null;
  const incompleteFirm = {
    id: "firm_incomplete",
    clientBillingProvider: "MANUAL",
    stripeConnectAccountId: "acct_123resume",
  } as never;

  const result = await createOrResumeStripeConnectClientBillingConnection(incompleteFirm, {
    provider: {
      getConnectionStatus() {
        throw new Error("not needed");
      },
      async createOrResumeConnection(firm) {
        seenAccountId = firm.stripeConnectAccountId;
        return { url: "https://connect.stripe.test/onboarding/session_resume" };
      },
      async refreshConnectionStatus() {
        throw new Error("not needed");
      },
      isReady() {
        return false;
      },
      async createOrUpdateCustomer() {
        return {};
      },
      async sendInvoice() {
        return {};
      },
      async syncInvoiceStatus() {
        return {};
      },
      handleWebhook() {
        return;
      },
    },
    env: {
      STRIPE_SECRET_KEY: "sk_test_123",
      CLIENT_BILLING_PROVIDERS_ENABLED: "manual,stripe_connect",
      STRIPE_CONNECT_CLIENT_PAYMENTS_ENABLED: "true",
    } as unknown as NodeJS.ProcessEnv,
  });

  assert.equal(seenAccountId, "acct_123resume");
  assert.equal(result?.url, "https://connect.stripe.test/onboarding/session_resume");
});

test("Stripe Connect onboarding is safely disabled when env toggles do not allow it", async () => {
  let called = false;
  const result = await createOrResumeStripeConnectClientBillingConnection(
    {
      id: "firm_disabled",
      clientBillingProvider: "MANUAL",
      stripeConnectAccountId: null,
    } as never,
    {
      provider: {
        getConnectionStatus() {
          throw new Error("not needed");
        },
        async createOrResumeConnection() {
          called = true;
          return { url: "https://connect.stripe.test/onboarding/session_blocked" };
        },
        async refreshConnectionStatus() {
          throw new Error("not needed");
        },
        isReady() {
          return false;
        },
        async createOrUpdateCustomer() {
          return {};
        },
        async sendInvoice() {
          return {};
        },
        async syncInvoiceStatus() {
          return {};
        },
        handleWebhook() {
          return;
        },
      },
      env: {
        STRIPE_SECRET_KEY: "",
        CLIENT_BILLING_PROVIDERS_ENABLED: "manual",
        STRIPE_CONNECT_CLIENT_PAYMENTS_ENABLED: "false",
      } as unknown as NodeJS.ProcessEnv,
    },
  );

  assert.equal(called, false);
  assert.equal(result, null);
});

test("stripeConnectClientPaymentsEnabled requires env toggles and a supported Stripe secret key", () => {
  assert.equal(
    stripeConnectClientPaymentsEnabled({
      STRIPE_SECRET_KEY: "sk_test_123",
      CLIENT_BILLING_PROVIDERS_ENABLED: "manual,stripe_connect",
      STRIPE_CONNECT_CLIENT_PAYMENTS_ENABLED: "true",
    } as unknown as NodeJS.ProcessEnv),
    true,
  );

  assert.equal(
    stripeConnectClientPaymentsEnabled({
      STRIPE_SECRET_KEY: "",
      CLIENT_BILLING_PROVIDERS_ENABLED: "manual,stripe_connect",
      STRIPE_CONNECT_CLIENT_PAYMENTS_ENABLED: "true",
    } as unknown as NodeJS.ProcessEnv),
    false,
  );
});

test("manual provider keeps external invoice fields unchanged and does not generate hosted invoices", async () => {
  const manualProvider = createManualClientBillingProvider();
  const result = await manualProvider.sendInvoice(
    {} as never,
    {
      externalInvoiceId: "ext_invoice_123",
      externalHostedInvoiceUrl: null,
      externalInvoicePdfUrl: null,
      externalInvoiceStatus: "manual",
      externalSyncedAt: null,
    } as never,
  );

  assert.equal(result.invoiceId, "ext_invoice_123");
  assert.equal(result.hostedInvoiceUrl, null);
  assert.equal(result.pdfUrl, null);
  assert.equal(result.status, "manual");
  assert.equal(result.syncedAt, null);
});

test("client payments hides resume onboarding when Stripe Connect is fully active", () => {
  const activeFirm = {
    clientBillingProvider: "STRIPE_CONNECT",
    stripeConnectAccountId: "acct_123active",
    clientBillingEnabled: true,
    stripeChargesEnabled: true,
    stripePayoutsEnabled: true,
    stripeDetailsSubmitted: true,
  } as never;

  const restrictedFirm = {
    clientBillingProvider: "STRIPE_CONNECT",
    stripeConnectAccountId: "acct_123resume",
    clientBillingEnabled: false,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeDetailsSubmitted: false,
  } as never;

  const manualFirm = {
    clientBillingProvider: "MANUAL",
    stripeConnectAccountId: null,
    clientBillingEnabled: false,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeDetailsSubmitted: false,
  } as never;

  assert.equal(getClientPaymentsPrimaryActionLabel(activeFirm), null);
  assert.equal(getClientPaymentsPrimaryActionLabel(restrictedFirm), "Resume onboarding");
  assert.equal(getClientPaymentsPrimaryActionLabel(manualFirm), "Connect Stripe");
});
