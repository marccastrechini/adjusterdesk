import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import type { Firm, Invoice } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientBillingProviderName } from "@/lib/client-billing/provider";
import { clientBillingProviderSelection, selectedClientInvoiceProvider } from "@/lib/client-billing/provider-choice";
import { clientPaymentsSetupPrompt, getClientPaymentsPrimaryActionLabel } from "@/lib/client-billing/ui";
import { intuitApiBase, QUICKBOOKS_ACCOUNTING_SCOPE, QUICKBOOKS_CALLBACK_PATH, QUICKBOOKS_WEBHOOK_PATH, readIntuitConfig } from "@/lib/client-billing/quickbooks/config";
import { QuickBooksClient } from "@/lib/client-billing/quickbooks/client";
import { beginQuickBooksConnection, completeQuickBooksConnection, disconnectQuickBooks } from "@/lib/client-billing/quickbooks/connection";
import { QuickBooksError } from "@/lib/client-billing/quickbooks/errors";
import { dollarsToCents, linkedInvoiceIds, quickBooksInvoiceSnapshot, sendQuickBooksInvoice } from "@/lib/client-billing/quickbooks/invoices";
import { decryptSecret, encryptSecret, createQuickBooksOAuthState, verifyQuickBooksOAuthState, type IntuitFetcher, type QuickBooksTokens } from "@/lib/client-billing/quickbooks/tokens";
import { handleQuickBooksWebhook, parseQuickBooksChanges, processQuickBooksWebhookPayload, verifyIntuitWebhookSignature } from "@/lib/client-billing/quickbooks/webhooks";
import { isQuickBooksFirmReady } from "@/lib/client-billing/quickbooks-provider";

const config = {
  clientId: "intuit-client",
  clientSecret: "intuit-secret",
  environment: "sandbox" as const,
  redirectUri: `https://sandbox.paclaimboard.com${QUICKBOOKS_CALLBACK_PATH}`,
  webhookVerifier: "verifier-token",
  tokenKey: "token-key",
  scope: QUICKBOOKS_ACCOUNTING_SCOPE,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function connectedFirm(overrides: Record<string, unknown> = {}) {
  return {
    id: "firm_1",
    clientBillingProvider: "QUICKBOOKS",
    clientBillingEnabled: true,
    clientBillingConnectionStatus: "ACTIVE",
    quickbooksRealmId: "123456",
    quickbooksCompanyName: "Harbor Adjusting",
    quickbooksAccessTokenEnc: encryptSecret("access-old", config.tokenKey),
    quickbooksRefreshTokenEnc: encryptSecret("refresh-old", config.tokenKey),
    quickbooksAccessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    quickbooksRefreshTokenExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    quickbooksEnvironment: "sandbox",
    quickbooksFeeItemId: null,
    clientPaymentFeeEnabled: true,
    clientPaymentFeeAcknowledgedAt: new Date("2026-11-01T00:00:00.000Z"),
    clientPaymentFeeBasisPoints: 0,
    clientPaymentFeeFixedCents: 250,
    clientPaymentFeeLabel: "Card fee recovery",
    ...overrides,
  } as unknown as Firm;
}

test("QuickBooks stays hidden until Intuit credentials are set and defaults to sandbox", () => {
  assert.equal(readIntuitConfig({} as unknown as NodeJS.ProcessEnv), null);
  assert.equal(readIntuitConfig({ INTUIT_CLIENT_ID: "id", INTUIT_CLIENT_SECRET: "" } as unknown as NodeJS.ProcessEnv), null);

  const sandbox = readIntuitConfig({
    INTUIT_CLIENT_ID: "id",
    INTUIT_CLIENT_SECRET: "secret",
    APP_BASE_URL: "https://sandbox.paclaimboard.com",
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(sandbox?.environment, "sandbox");
  assert.equal(sandbox?.redirectUri, `https://sandbox.paclaimboard.com${QUICKBOOKS_CALLBACK_PATH}`);
  assert.equal(sandbox?.scope, QUICKBOOKS_ACCOUNTING_SCOPE);
  assert.equal(intuitApiBase("sandbox"), "https://sandbox-quickbooks.api.intuit.com");

  const production = readIntuitConfig({
    INTUIT_CLIENT_ID: "id",
    INTUIT_CLIENT_SECRET: "secret",
    INTUIT_ENVIRONMENT: "Production",
    INTUIT_REDIRECT_URI: `https://paclaimboard.com${QUICKBOOKS_CALLBACK_PATH}`,
  } as unknown as NodeJS.ProcessEnv);
  assert.equal(production?.environment, "production");
  assert.equal(production?.redirectUri, `https://paclaimboard.com${QUICKBOOKS_CALLBACK_PATH}`);
  assert.equal(QUICKBOOKS_WEBHOOK_PATH, "/api/integrations/quickbooks/webhook");
});

test("QuickBooks tokens round-trip through encryption and reject tampering", () => {
  const encrypted = encryptSecret("refresh-token", config.tokenKey);
  assert.equal(decryptSecret(encrypted, config.tokenKey), "refresh-token");
  assert.throws(() => decryptSecret(encrypted.replace("v1", "v2"), config.tokenKey), QuickBooksError);
  const [version, iv, tag, data] = encrypted.split(".");
  assert.throws(() => decryptSecret([version, iv, tag, `${data}x`].join("."), config.tokenKey), QuickBooksError);
});

test("OAuth state is bound to the firm and expires", () => {
  const now = Date.parse("2026-11-20T12:00:00.000Z");
  const state = createQuickBooksOAuthState("firm_1", config.tokenKey, now);
  assert.deepEqual(verifyQuickBooksOAuthState(state, config.tokenKey, now + 60_000), { firmId: "firm_1", exp: now + 10 * 60 * 1000 });
  assert.equal(verifyQuickBooksOAuthState(state, "other-key", now), null);
  assert.equal(verifyQuickBooksOAuthState(state, config.tokenKey, now + 11 * 60 * 1000), null);
  assert.equal(verifyQuickBooksOAuthState("v1.not-signed.nope", config.tokenKey, now), null);
});

test("firms default to Stripe unless QuickBooks is already selected", () => {
  assert.equal(selectedClientInvoiceProvider({ clientBillingProvider: "MANUAL" } as Firm), "stripe");
  assert.equal(selectedClientInvoiceProvider({ clientBillingProvider: "STRIPE_CONNECT" } as Firm), "stripe");
  assert.equal(selectedClientInvoiceProvider({ clientBillingProvider: "QUICKBOOKS" } as Firm), "quickbooks");
  assert.equal(getClientBillingProviderName({ clientBillingProvider: "QUICKBOOKS" } as Firm), "quickbooks");
  assert.equal(
    isQuickBooksFirmReady(connectedFirm(), { INTUIT_CLIENT_ID: "id", INTUIT_CLIENT_SECRET: "secret" } as unknown as NodeJS.ProcessEnv),
    true,
  );
  assert.equal(isQuickBooksFirmReady(connectedFirm(), {} as unknown as NodeJS.ProcessEnv), false);

  const stripeFirm = {
    clientBillingProvider: "QUICKBOOKS",
    stripeConnectAccountId: "acct_123",
    stripeChargesEnabled: true,
    stripePayoutsEnabled: true,
    stripeDetailsSubmitted: true,
    quickbooksRealmId: "123456",
    quickbooksRefreshTokenEnc: "stored",
    clientBillingEnabled: true,
    clientBillingConnectionStatus: "ACTIVE",
  } as unknown as Firm;
  assert.equal(clientBillingProviderSelection(stripeFirm, "stripe").clientBillingProvider, "STRIPE_CONNECT");
  assert.equal(clientBillingProviderSelection(stripeFirm, "stripe").clientBillingEnabled, true);
  assert.equal(clientBillingProviderSelection({ ...stripeFirm, stripeConnectAccountId: null } as Firm, "stripe").clientBillingProvider, "MANUAL");
  assert.equal(clientBillingProviderSelection(connectedFirm({ quickbooksRefreshTokenEnc: null }), "quickbooks").clientBillingConnectionStatus, "NOT_STARTED");

  const quickBooksFirm = connectedFirm();
  assert.equal(getClientPaymentsPrimaryActionLabel(quickBooksFirm), null);
  assert.equal(clientPaymentsSetupPrompt(quickBooksFirm), null);
  const disconnected = connectedFirm({ quickbooksRealmId: null, quickbooksRefreshTokenEnc: null, clientBillingEnabled: false });
  assert.equal(getClientPaymentsPrimaryActionLabel(disconnected), "Connect QuickBooks");
  assert.match(clientPaymentsSetupPrompt(disconnected)?.message ?? "", /QuickBooks/);
});

test("invoice amounts convert QuickBooks dollars to collected cents", () => {
  assert.equal(dollarsToCents(19.99), 1999);
  assert.equal(dollarsToCents(10.1), 1010);
  assert.deepEqual(quickBooksInvoiceSnapshot({ TotalAmt: 152.5, Balance: 0 }), {
    totalCents: 15250,
    balanceCents: 0,
    paidCents: 15250,
    settlement: "paid",
  });
  assert.equal(quickBooksInvoiceSnapshot({ TotalAmt: 150, Balance: 50 }).settlement, "partial");
  assert.equal(quickBooksInvoiceSnapshot({ TotalAmt: 150 }).settlement, "open");
  assert.deepEqual(linkedInvoiceIds([{ LinkedTxn: [{ TxnId: "55", TxnType: "Invoice" }, { TxnId: "9", TxnType: "Payment" }] }]), ["55"]);
});

test("connect, callback, and disconnect talk to Intuit and store encrypted tokens", async () => {
  const calls: string[] = [];
  const fetcher: IntuitFetcher = async (url, init) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/tokens/bearer")) {
      return jsonResponse({
        access_token: "access-new",
        refresh_token: "refresh-new",
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
      });
    }
    if (String(url).includes("/companyinfo/")) {
      return jsonResponse({ CompanyInfo: { CompanyName: "Sandbox Adjusting" } });
    }
    if (String(url).includes("/tokens/revoke")) {
      assert.match(String(init?.body), /refresh-old/);
      return jsonResponse({});
    }
    throw new Error(`unexpected ${url}`);
  };

  const originalUpdate = prisma.firm.update;
  const updates: Array<Record<string, unknown>> = [];
  prisma.firm.update = (async (args: { data: Record<string, unknown> }) => {
    updates.push(args.data);
    return { id: "firm_1" };
  }) as unknown as typeof prisma.firm.update;

  try {
    const started = await beginQuickBooksConnection(connectedFirm({ quickbooksRefreshTokenEnc: null, clientBillingEnabled: false }), config);
    const startedUrl = new URL(started.url);
    assert.equal(startedUrl.origin, "https://appcenter.intuit.com");
    assert.equal(startedUrl.searchParams.get("scope"), QUICKBOOKS_ACCOUNTING_SCOPE);
    assert.equal(startedUrl.searchParams.get("scope")?.includes("quickbooks.payment"), false);
    assert.equal(startedUrl.searchParams.get("redirect_uri"), config.redirectUri);
    assert.equal(updates[0]?.clientBillingConnectionStatus, "ONBOARDING");

    const state = startedUrl.searchParams.get("state");
    await assert.rejects(
      completeQuickBooksConnection({ firm: connectedFirm(), code: "auth-code", state: "bad", realmId: "123456", fetcher, config }),
      /could not be confirmed/,
    );
    await completeQuickBooksConnection({ firm: connectedFirm(), code: "auth-code", state, realmId: "123456", fetcher, config });
    const saved = updates.at(-1);
    assert.equal(saved?.quickbooksCompanyName, "Sandbox Adjusting");
    assert.equal(saved?.quickbooksRealmId, "123456");
    assert.equal(saved?.clientBillingProvider, "QUICKBOOKS");
    assert.equal(saved?.quickbooksEnvironment, "sandbox");
    assert.equal(decryptSecret(String(saved?.quickbooksAccessTokenEnc), config.tokenKey), "access-new");
    assert.equal(decryptSecret(String(saved?.quickbooksRefreshTokenEnc), config.tokenKey), "refresh-new");

    await disconnectQuickBooks(connectedFirm(), fetcher, config);
    assert.equal(calls.some((call) => call.startsWith("POST") && call.includes("/tokens/revoke")), true);
    assert.equal(updates.at(-1)?.quickbooksRefreshTokenEnc, null);
    assert.equal(updates.at(-1)?.clientBillingEnabled, false);
  } finally {
    prisma.firm.update = originalUpdate;
  }
});

test("expired access tokens refresh before the accounting API call", async () => {
  const seen: string[] = [];
  const fetcher: IntuitFetcher = async (url, init) => {
    seen.push(String(url));
    if (url.includes("/tokens/bearer")) {
      return jsonResponse({ access_token: "access-new", refresh_token: "refresh-new", expires_in: 3600, x_refresh_token_expires_in: 86400 });
    }
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-new");
    return jsonResponse({ CompanyInfo: { CompanyName: "Sandbox Adjusting" } });
  };
  const stored: { tokens: QuickBooksTokens | null } = { tokens: null };
  const tokens: QuickBooksTokens = {
    accessToken: "access-old",
    refreshToken: "refresh-old",
    accessTokenExpiresAt: new Date(Date.now() - 1000),
    refreshTokenExpiresAt: new Date(Date.now() + 86400000),
  };
  const client = new QuickBooksClient({
    config,
    environment: "sandbox",
    realmId: "123456",
    tokens,
    fetcher,
    onTokens: async (next) => {
      stored.tokens = next;
    },
  });

  const info = await client.getCompanyInfo();
  assert.equal(info.CompanyName, "Sandbox Adjusting");
  assert.equal(stored.tokens?.refreshToken, "refresh-new");
  assert.equal(seen[0]?.includes("oauth.platform.intuit.com"), true);
  assert.equal(seen[1]?.startsWith("https://sandbox-quickbooks.api.intuit.com/"), true);
});

test("sending a fee invoice creates the QuickBooks customer, item, and emailed invoice", async () => {
  const requests: Array<{ method: string; url: string; body: string }> = [];
  const fetcher: IntuitFetcher = async (url, init) => {
    const method = init?.method ?? "GET";
    const href = String(url);
    requests.push({ method, url: href, body: typeof init?.body === "string" ? init.body : "" });
    const parsed = new URL(href);
    const query = parsed.searchParams.get("query") ?? "";
    if (parsed.pathname.endsWith("/query") && query.includes("Customer")) {
      return jsonResponse({ QueryResponse: {} });
    }
    if (method === "POST" && parsed.pathname.endsWith("/customer")) {
      return jsonResponse({ Customer: { Id: "10", DisplayName: "Ada Client" } });
    }
    if (parsed.pathname.endsWith("/query") && query.includes("Item")) {
      return jsonResponse({ QueryResponse: {} });
    }
    if (parsed.pathname.endsWith("/query") && query.includes("Account")) {
      return jsonResponse({ QueryResponse: { Account: [{ Id: "7", AccountType: "Income", AccountSubType: "ServiceFeeIncome" }] } });
    }
    if (method === "POST" && parsed.pathname.endsWith("/item")) {
      return jsonResponse({ Item: { Id: "21", Type: "Service" } });
    }
    if (method === "POST" && parsed.pathname.endsWith("/send")) {
      assert.equal(parsed.searchParams.get("sendTo"), "ada@example.com");
      return jsonResponse({ Invoice: { Id: "55", EmailStatus: "EmailSent", TotalAmt: 152.5, Balance: 152.5 } });
    }
    if (method === "POST" && parsed.pathname.endsWith("/invoice")) {
      return jsonResponse({ Invoice: { Id: "55", TotalAmt: 152.5, Balance: 152.5, EmailStatus: "NeedToSend" } });
    }
    if (method === "GET" && parsed.pathname.endsWith("/invoice/55")) {
      assert.equal(parsed.searchParams.get("include"), "invoiceLink");
      assert.equal(parsed.searchParams.get("minorversion"), "75");
      return jsonResponse({
        Invoice: {
          Id: "55",
          InvoiceLink: "https://connect.intuit.com/portal/app/pay/55",
          TotalAmt: 152.5,
          Balance: 152.5,
          EmailStatus: "EmailSent",
        },
      });
    }
    throw new Error(`unexpected ${method} ${href}`);
  };

  const invoiceUpdates: Array<Record<string, unknown>> = [];
  const originals = {
    invoiceUpdate: prisma.invoice.update,
    firmUpdate: prisma.firm.update,
    contactUpdate: prisma.contact.update,
    activityCreate: prisma.activity.create,
  };
  prisma.invoice.update = (async (args: { data: Record<string, unknown> }) => {
    invoiceUpdates.push(args.data);
    return { id: "inv_1" };
  }) as unknown as typeof prisma.invoice.update;
  prisma.firm.update = (async () => ({ id: "firm_1" })) as unknown as typeof prisma.firm.update;
  prisma.contact.update = (async (args: { data: { externalBillingCustomerId?: string; externalBillingProvider?: string } }) => {
    assert.equal(args.data.externalBillingCustomerId, "10");
    assert.equal(args.data.externalBillingProvider, "quickbooks");
    return { id: "contact_1" };
  }) as unknown as typeof prisma.contact.update;
  prisma.activity.create = (async (args: { data: { subject?: string } }) => {
    assert.equal(args.data.subject, "Invoice sent to client");
    return { id: "activity_1" };
  }) as unknown as typeof prisma.activity.create;

  try {
    const result = await sendQuickBooksInvoice({
      firm: connectedFirm(),
      invoice: {
        id: "inv_1",
        firmId: "firm_1",
        claimId: "claim_1",
        invoiceNumber: "AD-1001",
        status: "DRAFT",
        feeAmountCents: 15_000,
        amountPaidCents: 0,
        issuedAt: new Date("2026-11-20T00:00:00.000Z"),
        dueAt: new Date("2026-12-20T00:00:00.000Z"),
        externalInvoiceId: null,
        sentToClientAt: null,
      } as unknown as Invoice,
      claim: {
        id: "claim_1",
        firmId: "firm_1",
        contactId: "contact_1",
        claimNumber: "CLM-9",
        contact: {
          id: "contact_1",
          firstName: "Ada",
          lastName: "Client",
          email: "ada@example.com",
          phone: "555-0100",
          company: null,
          externalBillingCustomerId: null,
          externalBillingProvider: null,
        },
      } as never,
      fetcher,
      config,
    });

    assert.equal(result.invoiceId, "55");
    assert.equal(result.hostedInvoiceUrl, "https://connect.intuit.com/portal/app/pay/55");
    assert.equal(result.status, "open");
    const invoiceRequest = requests.find((request) => request.method === "POST" && request.url.includes("/invoice") && !request.url.includes("/send"));
    const invoiceBody = JSON.parse(invoiceRequest?.body ?? "{}") as {
      DocNumber?: string;
      AllowOnlineACHPayment?: boolean;
      AllowOnlineCreditCardPayment?: boolean;
      Line?: Array<{ Amount?: number; Description?: string }>;
    };
    assert.equal(invoiceBody.DocNumber, "AD-1001");
    assert.equal(invoiceBody.AllowOnlineACHPayment, true);
    assert.equal(invoiceBody.AllowOnlineCreditCardPayment, true);
    assert.deepEqual(
      invoiceBody.Line?.map((line) => line.Amount),
      [150, 2.5],
    );
    assert.match(invoiceBody.Line?.[1]?.Description ?? "", /Card fee recovery/);
    assert.equal(requests.some((request) => request.url.startsWith("https://sandbox-quickbooks.api.intuit.com/")), true);
    assert.equal(invoiceUpdates.at(-1)?.externalInvoiceId, "55");
    assert.equal(invoiceUpdates.at(-1)?.externalHostedInvoiceUrl, "https://connect.intuit.com/portal/app/pay/55");
    await assert.rejects(
      sendQuickBooksInvoice({
        firm: connectedFirm(),
        invoice: { id: "inv_1", firmId: "firm_1" } as Invoice,
        claim: { id: "claim_1", firmId: "firm_1", contact: { email: "  " } } as never,
        fetcher,
        config,
      }),
      (error: unknown) => error instanceof QuickBooksError && error.code === "missing_email",
    );
  } finally {
    prisma.invoice.update = originals.invoiceUpdate;
    prisma.firm.update = originals.firmUpdate;
    prisma.contact.update = originals.contactUpdate;
    prisma.activity.create = originals.activityCreate;
  }
});

test("webhook signature rejects bad payloads and a paid invoice is recorded once", async () => {
  const legacy = JSON.stringify({
    eventNotifications: [
      {
        realmId: "123456",
        dataChangeEvent: {
          entities: [{ name: "Invoice", id: "55", operation: "Update", lastUpdated: "2026-11-20T00:00:00-0000" }],
        },
      },
    ],
  });
  const cloud = JSON.stringify([
    {
      specversion: "1.0",
      type: "qbo.payment.created.v1",
      intuitentityid: "99",
      intuitaccountid: "123456",
    },
  ]);
  assert.equal(parseQuickBooksChanges(legacy)[0]?.entity, "Invoice");
  assert.deepEqual(parseQuickBooksChanges(cloud)[0], { realmId: "123456", entity: "Payment", id: "99", operation: "created" });

  const signature = createHmac("sha256", config.webhookVerifier).update(legacy).digest("base64");
  assert.equal(verifyIntuitWebhookSignature(legacy, signature, config.webhookVerifier), true);
  assert.equal(verifyIntuitWebhookSignature(legacy, signature, "other"), false);
  assert.equal(verifyIntuitWebhookSignature(`${legacy} `, signature, config.webhookVerifier), false);

  const missing = await handleQuickBooksWebhook(new Request("https://sandbox.paclaimboard.com/api/integrations/quickbooks/webhook", { method: "POST", body: legacy }), null);
  assert.equal(missing.status, 503);
  const rejected = await handleQuickBooksWebhook(
    new Request("https://sandbox.paclaimboard.com/api/integrations/quickbooks/webhook", {
      method: "POST",
      body: legacy,
      headers: { "intuit-signature": "not-the-signature" },
    }),
    config,
  );
  assert.equal(rejected.status, 401);
  const emptyBody = JSON.stringify({ eventNotifications: [] });
  const emptySignature = createHmac("sha256", config.webhookVerifier).update(emptyBody).digest("base64");
  const accepted = await handleQuickBooksWebhook(
    new Request("https://sandbox.paclaimboard.com/api/integrations/quickbooks/webhook", {
      method: "POST",
      body: emptyBody,
      headers: { "intuit-signature": emptySignature },
    }),
    config,
  );
  assert.equal(accepted.status, 200);

  const firm = connectedFirm();
  let invoice = {
    id: "inv_1",
    firmId: "firm_1",
    claimId: "claim_1",
    invoiceNumber: "AD-1001",
    status: "SENT",
    feeAmountCents: 15_000,
    amountPaidCents: 0,
    paidAt: null,
    externalInvoiceId: "55",
    externalHostedInvoiceUrl: null,
    externalInvoicePdfUrl: null,
    clientBillingProvider: "QUICKBOOKS",
  };
  const recordedPayment: { current: Record<string, unknown> | null } = { current: null };
  let creates = 0;
  let activities = 0;
  const originals = {
    findMany: prisma.firm.findMany,
    findFirst: prisma.firm.findFirst,
    invoiceFindFirst: prisma.invoice.findFirst,
    invoiceUpdate: prisma.invoice.update,
    claimFind: prisma.claim.findUnique,
    paymentFind: prisma.payment.findFirst,
    paymentCreate: prisma.payment.create,
    paymentUpdate: prisma.payment.update,
    activityCreate: prisma.activity.create,
    transaction: prisma.$transaction,
  };
  prisma.firm.findMany = (async () => [{ id: firm.id }]) as unknown as typeof prisma.firm.findMany;
  prisma.firm.findFirst = (async () => firm) as unknown as typeof prisma.firm.findFirst;
  prisma.invoice.findFirst = (async () => invoice) as unknown as typeof prisma.invoice.findFirst;
  prisma.invoice.update = (async (args: { data: Record<string, unknown> }) => {
    invoice = { ...invoice, ...args.data } as typeof invoice;
    return invoice;
  }) as unknown as typeof prisma.invoice.update;
  prisma.claim.findUnique = (async () => ({
    id: "claim_1",
    firmId: "firm_1",
    contactId: "contact_1",
    contact: { company: null, firstName: "Ada", lastName: "Client" },
  })) as unknown as typeof prisma.claim.findUnique;
  prisma.payment.findFirst = (async () => recordedPayment.current) as unknown as typeof prisma.payment.findFirst;
  prisma.payment.create = (async (args: { data: { externalProvider?: string; amountCents?: number } }) => {
    creates += 1;
    assert.equal(args.data.externalProvider, "quickbooks");
    recordedPayment.current = { id: "pay_1", ...args.data };
    return recordedPayment.current;
  }) as unknown as typeof prisma.payment.create;
  prisma.payment.update = (async () => recordedPayment.current ?? { id: "pay_1" }) as unknown as typeof prisma.payment.update;
  prisma.activity.create = (async () => {
    activities += 1;
    return { id: "activity_1" };
  }) as unknown as typeof prisma.activity.create;
  prisma.$transaction = (async (fn: (tx: typeof prisma) => Promise<void>) => fn(prisma)) as unknown as typeof prisma.$transaction;

  const fetcher: IntuitFetcher = async () =>
    jsonResponse({
      Invoice: {
        Id: "55",
        TotalAmt: 152.5,
        Balance: 0,
        InvoiceLink: "https://connect.intuit.com/portal/app/pay/55",
        LinkedTxn: [{ TxnId: "99", TxnType: "Payment" }],
      },
    });

  try {
    await processQuickBooksWebhookPayload(legacy, { config, fetcher });
    await processQuickBooksWebhookPayload(legacy, { config, fetcher });
    assert.equal(invoice.status, "PAID");
    assert.equal(invoice.amountPaidCents, 15250);
    assert.equal(creates, 1);
    assert.equal(activities, 1);
    assert.equal(recordedPayment.current?.externalPaymentId, "99");
  } finally {
    prisma.firm.findMany = originals.findMany;
    prisma.firm.findFirst = originals.findFirst;
    prisma.invoice.findFirst = originals.invoiceFindFirst;
    prisma.invoice.update = originals.invoiceUpdate;
    prisma.claim.findUnique = originals.claimFind;
    prisma.payment.findFirst = originals.paymentFind;
    prisma.payment.create = originals.paymentCreate;
    prisma.payment.update = originals.paymentUpdate;
    prisma.activity.create = originals.activityCreate;
    prisma.$transaction = originals.transaction;
  }
});
