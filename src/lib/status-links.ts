import { randomBytes } from "node:crypto";

const tokenPattern = /^[A-Za-z0-9_-]{24,64}$/;

export function generateClientStatusToken() {
  return randomBytes(18).toString("base64url");
}

export function isClientStatusToken(value: string) {
  return tokenPattern.test(value);
}

export function clientStatusPath(token: string) {
  return `/status/${token}`;
}