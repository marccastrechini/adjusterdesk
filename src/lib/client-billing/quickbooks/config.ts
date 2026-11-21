import { QuickBooksError } from "./errors";

export const QUICKBOOKS_ACCOUNTING_SCOPE = "com.intuit.quickbooks.accounting";
export const QUICKBOOKS_CALLBACK_PATH = "/api/integrations/quickbooks/callback";
export const QUICKBOOKS_WEBHOOK_PATH = "/api/integrations/quickbooks/webhook";
export const INTUIT_MINOR_VERSION = "75";

export type IntuitEnvironment = "sandbox" | "production";

export type IntuitConfig = {
  clientId: string;
  clientSecret: string;
  environment: IntuitEnvironment;
  redirectUri: string;
  webhookVerifier: string;
  tokenKey: string;
  scope: string;
};

function appBaseUrl(env: NodeJS.ProcessEnv) {
  const configured = env.APP_BASE_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export function intuitApiBase(environment: IntuitEnvironment) {
  return environment === "production" ? "https://quickbooks.api.intuit.com" : "https://sandbox-quickbooks.api.intuit.com";
}

/**
 * QuickBooks is hidden until the Intuit app credentials are set.
 * The environment defaults to sandbox. Anything other than "production" stays in the sandbox.
 * Online card and ACH are collected by QuickBooks Payments on the emailed invoice, so the
 * Accounting scope is enough. The Payments API scope is not requested.
 */
export function readIntuitConfig(env: NodeJS.ProcessEnv = process.env): IntuitConfig | null {
  const clientId = env.INTUIT_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.INTUIT_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) {
    return null;
  }

  const environment = env.INTUIT_ENVIRONMENT?.trim().toLowerCase() === "production" ? "production" : "sandbox";
  const redirectUri = env.INTUIT_REDIRECT_URI?.trim() || `${appBaseUrl(env)}${QUICKBOOKS_CALLBACK_PATH}`;
  const tokenKey = env.INTUIT_TOKEN_ENCRYPTION_KEY?.trim() || clientSecret;

  return {
    clientId,
    clientSecret,
    environment,
    redirectUri,
    webhookVerifier: env.INTUIT_WEBHOOK_VERIFIER_TOKEN?.trim() ?? "",
    tokenKey,
    scope: QUICKBOOKS_ACCOUNTING_SCOPE,
  };
}

export function quickbooksClientPaymentsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return readIntuitConfig(env) !== null;
}

export function requireIntuitConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = readIntuitConfig(env);
  if (!config) {
    throw new QuickBooksError("QuickBooks is not configured.", "not_configured");
  }

  return config;
}
