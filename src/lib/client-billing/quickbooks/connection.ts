import { ClientBillingConnectionStatus, type Firm } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireIntuitConfig, type IntuitConfig } from "./config";
import { firmQuickBooksEnvironment, QuickBooksClient, quickBooksClientForFirm, type IntuitFetcher } from "./client";
import { QuickBooksError } from "./errors";
import { syncOpenQuickBooksInvoices } from "./invoices";
import { buildQuickBooksAuthorizeUrl, createQuickBooksOAuthState, decryptSecret, encryptSecret, exchangeQuickBooksAuthorizationCode, revokeQuickBooksToken, verifyQuickBooksOAuthState } from "./tokens";

function isAuthFailure(error: unknown) {
  return error instanceof QuickBooksError && (error.code === "invalid_grant" || error.code === "token_unreadable" || error.status === 401);
}

export async function beginQuickBooksConnection(firm: Firm, config: IntuitConfig = requireIntuitConfig()) {
  const state = createQuickBooksOAuthState(firm.id, config.tokenKey);
  const ready = Boolean(firm.quickbooksRealmId && firm.quickbooksRefreshTokenEnc && firm.clientBillingEnabled && firm.clientBillingConnectionStatus === ClientBillingConnectionStatus.ACTIVE);
  if (!ready) {
    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        clientBillingProvider: "QUICKBOOKS",
        clientBillingEnabled: false,
        clientBillingConnectionStatus: ClientBillingConnectionStatus.ONBOARDING,
      },
    });
  }

  return { url: buildQuickBooksAuthorizeUrl(config, state) };
}

export async function completeQuickBooksConnection(args: { firm: Firm; code: string | null; state: string | null; realmId: string | null; fetcher?: IntuitFetcher; config?: IntuitConfig }) {
  const config = args.config ?? requireIntuitConfig();
  const parsed = verifyQuickBooksOAuthState(args.state, config.tokenKey);
  if (!parsed || parsed.firmId !== args.firm.id) {
    throw new QuickBooksError("QuickBooks connection could not be confirmed.", "invalid_state");
  }
  if (!args.code || !args.realmId || !/^\d+$/.test(args.realmId)) {
    throw new QuickBooksError("QuickBooks did not return a company.", "missing_code");
  }

  const tokens = await exchangeQuickBooksAuthorizationCode(config, args.code, args.fetcher);
  const client = new QuickBooksClient({
    config,
    environment: config.environment,
    realmId: args.realmId,
    tokens,
    fetcher: args.fetcher,
  });

  let companyName: string | null = null;
  try {
    const info = await client.getCompanyInfo();
    companyName = info.CompanyName?.trim() || null;
  } catch (error) {
    console.error("[client-billing] QuickBooks company lookup failed.", error instanceof Error ? error.message : "unknown");
  }

  const stored = client.currentTokens();
  await prisma.firm.update({
    where: { id: args.firm.id },
    data: {
      clientBillingProvider: "QUICKBOOKS",
      clientBillingEnabled: true,
      clientBillingConnectionStatus: ClientBillingConnectionStatus.ACTIVE,
      quickbooksRealmId: args.realmId,
      quickbooksCompanyName: companyName,
      quickbooksAccessTokenEnc: encryptSecret(stored.accessToken, config.tokenKey),
      quickbooksRefreshTokenEnc: encryptSecret(stored.refreshToken, config.tokenKey),
      quickbooksAccessTokenExpiresAt: stored.accessTokenExpiresAt,
      quickbooksRefreshTokenExpiresAt: stored.refreshTokenExpiresAt,
      quickbooksScope: config.scope,
      quickbooksEnvironment: config.environment,
      quickbooksFeeItemId: null,
      quickbooksConnectedAt: new Date(),
    },
  });
}

export async function disconnectQuickBooks(firm: Firm, fetcher?: IntuitFetcher, config?: IntuitConfig) {
  const resolved = config ?? requireIntuitConfig();
  if (firm.quickbooksRefreshTokenEnc) {
    try {
      const refreshToken = decryptSecret(firm.quickbooksRefreshTokenEnc, resolved.tokenKey);
      await revokeQuickBooksToken(resolved, refreshToken, fetcher);
    } catch (error) {
      console.error("[client-billing] QuickBooks token revoke failed.", error instanceof Error ? error.message : "unknown");
    }
  }

  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      quickbooksRealmId: null,
      quickbooksCompanyName: null,
      quickbooksAccessTokenEnc: null,
      quickbooksRefreshTokenEnc: null,
      quickbooksAccessTokenExpiresAt: null,
      quickbooksRefreshTokenExpiresAt: null,
      quickbooksScope: null,
      quickbooksEnvironment: null,
      quickbooksFeeItemId: null,
      quickbooksConnectedAt: null,
      clientBillingEnabled: false,
      clientBillingConnectionStatus: ClientBillingConnectionStatus.NOT_STARTED,
    },
  });
}

export async function refreshQuickBooksConnection(firm: Firm, fetcher?: IntuitFetcher, config: IntuitConfig = requireIntuitConfig()) {
  if (!firm.quickbooksRealmId || !firm.quickbooksRefreshTokenEnc) {
    return {
      provider: "quickbooks" as const,
      connectionStatus: ClientBillingConnectionStatus.NOT_STARTED,
      ready: false,
    };
  }

  try {
    const client = await quickBooksClientForFirm(firm, config, fetcher);
    const info = await client.getCompanyInfo();
    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        quickbooksCompanyName: info.CompanyName ?? firm.quickbooksCompanyName,
        quickbooksEnvironment: firmQuickBooksEnvironment(firm, config),
        clientBillingProvider: "QUICKBOOKS",
        clientBillingEnabled: true,
        clientBillingConnectionStatus: ClientBillingConnectionStatus.ACTIVE,
      },
    });
    await syncOpenQuickBooksInvoices(firm, client);
    return {
      provider: "quickbooks" as const,
      connectionStatus: ClientBillingConnectionStatus.ACTIVE,
      ready: true,
    };
  } catch (error) {
    if (!isAuthFailure(error)) {
      throw error;
    }

    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        clientBillingEnabled: false,
        clientBillingConnectionStatus: ClientBillingConnectionStatus.RESTRICTED,
      },
    });
    return {
      provider: "quickbooks" as const,
      connectionStatus: ClientBillingConnectionStatus.RESTRICTED,
      ready: false,
    };
  }
}
