import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const passwordAlgorithm = "scrypt";
const developmentAuthSecret = "adjusterdesk-dev-auth-secret";

export const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;
const defaultPasswordResetTokenMinutes = 30;

export type SessionPayload = {
  userId: string;
  exp: number;
};

function equalText(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSessionPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function hasConfiguredAuthSecret() {
  return Boolean(process.env.AUTH_SECRET?.trim());
}

export function resolveAuthSecret() {
  const configuredSecret = process.env.AUTH_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  return process.env.NODE_ENV === "production" ? "" : developmentAuthSecret;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${passwordAlgorithm}$${salt}$${derivedKey}`;
}

export function createPasswordResetTokenValue() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function resolvePasswordResetTokenMinutes() {
  const configuredValue = process.env.PASSWORD_RESET_TOKEN_MINUTES?.trim();
  const parsedValue = configuredValue ? Number.parseInt(configuredValue, 10) : defaultPasswordResetTokenMinutes;

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return defaultPasswordResetTokenMinutes;
}

export function resolveAppBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  return configuredUrl || "http://localhost:3000";
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedDigest] = passwordHash.split("$");

  if (algorithm !== passwordAlgorithm || !salt || !expectedDigest) {
    return false;
  }

  const actualDigest = scryptSync(password, salt, 64).toString("hex");
  return equalText(expectedDigest, actualDigest);
}

export function createSignedSessionValue(userId: string, secret: string, now = Date.now()) {
  const payload: SessionPayload = {
    userId,
    exp: now + sessionDurationMs,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signSessionPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifySignedSessionValue(sessionValue: string, secret: string, now = Date.now()): SessionPayload | null {
  if (!sessionValue || !secret) {
    return null;
  }

  const [encodedPayload, signature, ...rest] = sessionValue.split(".");
  if (!encodedPayload || !signature || rest.length > 0) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload, secret);
  if (!equalText(expectedSignature, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;

    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}