import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Firm } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { IntuitConfig } from "./config";
import { QuickBooksError } from "./errors";

export type IntuitFetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type QuickBooksTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

const stateTtlMs = 10 * 60 * 1000;
const tokenEndpoint = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const revokeEndpoint = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

function encryptionKey(material: string) {
  return createHash("sha256").update(material, "utf8").digest();
}

export function safeEqual(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function encryptSecret(plaintext: string, material: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(material), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, material: string) {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart || payload.split(".").length !== 4) {
    throw new QuickBooksError("Stored QuickBooks token could not be read.", "token_unreadable");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(material), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new QuickBooksError("Stored QuickBooks token could not be read.", "token_unreadable");
  }
}

export function createQuickBooksOAuthState(firmId: string, tokenKey: string, now = Date.now()) {
  const payload = {
    firmId,
    exp: now + stateTtlMs,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", tokenKey).update(encoded).digest("base64url");
  return `v1.${encoded}.${signature}`;
}

export function verifyQuickBooksOAuthState(state: string | null, tokenKey: string, now = Date.now()) {
  if (!state) {
    return null;
  }

  const [version, encoded, signature] = state.split(".");
  if (version !== "v1" || !encoded || !signature || state.split(".").length !== 3) {
    return null;
  }

  const expected = createHmac("sha256", tokenKey).update(encoded).digest("base64url");
  if (!safeEqual(expected, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { firmId?: unknown; exp?: unknown };
    if (typeof payload.firmId !== "string" || !payload.firmId || typeof payload.exp !== "number" || payload.exp < now) {
      return null;
    }

    return { firmId: payload.firmId, exp: payload.exp };
  } catch {
    return null;
  }
}

export function buildQuickBooksAuthorizeUrl(config: IntuitConfig, state: string) {
  const url = new URL("https://appcenter.intuit.com/connect/oauth2");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuthorization(config: IntuitConfig) {
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

function tokensFromResponse(body: TokenResponse, now = Date.now()): QuickBooksTokens {
  if (!body.access_token || !body.refresh_token) {
    throw new QuickBooksError(body.error_description || body.error || "QuickBooks did not return tokens.", body.error || "missing_token");
  }

  const accessSeconds = body.expires_in ?? 3600;
  const refreshSeconds = body.x_refresh_token_expires_in ?? 60 * 60 * 24 * 100;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    accessTokenExpiresAt: new Date(now + accessSeconds * 1000),
    refreshTokenExpiresAt: new Date(now + refreshSeconds * 1000),
  };
}

async function readTokenError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as TokenResponse;
    return new QuickBooksError(parsed.error_description || parsed.error || `QuickBooks token request failed (${response.status}).`, parsed.error, response.status);
  } catch {
    return new QuickBooksError(`QuickBooks token request failed (${response.status}).`, undefined, response.status);
  }
}

export async function requestQuickBooksTokens(config: IntuitConfig, body: URLSearchParams, fetcher: IntuitFetcher = fetch, now = Date.now()) {
  const response = await fetcher(tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: basicAuthorization(config),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw await readTokenError(response);
  }

  const parsed = (await response.json()) as TokenResponse;
  return tokensFromResponse(parsed, now);
}

export async function exchangeQuickBooksAuthorizationCode(config: IntuitConfig, code: string, fetcher?: IntuitFetcher) {
  return requestQuickBooksTokens(
    config,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
    fetcher,
  );
}

export async function refreshQuickBooksTokens(config: IntuitConfig, refreshToken: string, fetcher?: IntuitFetcher) {
  return requestQuickBooksTokens(
    config,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    fetcher,
  );
}

export async function revokeQuickBooksToken(config: IntuitConfig, refreshToken: string, fetcher: IntuitFetcher = fetch) {
  const response = await fetcher(revokeEndpoint, {
    method: "POST",
    headers: {
      Authorization: basicAuthorization(config),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: refreshToken }),
  });

  if (!response.ok) {
    throw await readTokenError(response);
  }
}

export function readStoredQuickBooksTokens(firm: Pick<Firm, "quickbooksAccessTokenEnc" | "quickbooksRefreshTokenEnc" | "quickbooksAccessTokenExpiresAt" | "quickbooksRefreshTokenExpiresAt">, config: IntuitConfig): QuickBooksTokens | null {
  if (!firm.quickbooksAccessTokenEnc || !firm.quickbooksRefreshTokenEnc) {
    return null;
  }

  return {
    accessToken: decryptSecret(firm.quickbooksAccessTokenEnc, config.tokenKey),
    refreshToken: decryptSecret(firm.quickbooksRefreshTokenEnc, config.tokenKey),
    accessTokenExpiresAt: firm.quickbooksAccessTokenExpiresAt ?? new Date(0),
    refreshTokenExpiresAt: firm.quickbooksRefreshTokenExpiresAt ?? new Date(0),
  };
}

export async function persistQuickBooksTokens(firmId: string, tokens: QuickBooksTokens, config: IntuitConfig) {
  await prisma.firm.update({
    where: { id: firmId },
    data: {
      quickbooksAccessTokenEnc: encryptSecret(tokens.accessToken, config.tokenKey),
      quickbooksRefreshTokenEnc: encryptSecret(tokens.refreshToken, config.tokenKey),
      quickbooksAccessTokenExpiresAt: tokens.accessTokenExpiresAt,
      quickbooksRefreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    },
  });
}
