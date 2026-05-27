import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPasswordResetTokenValue,
  createSignedSessionValue,
  hashPassword,
  hashPasswordResetToken,
  resolveUserInvitationTokenMinutes,
  verifyPassword,
  verifySignedSessionValue,
} from "./auth";

describe("password auth helpers", () => {
  it("hashes and verifies a password", () => {
    const passwordHash = hashPassword("AdjusterDeskDemo123!");

    assert.notEqual(passwordHash, "AdjusterDeskDemo123!");
    assert.equal(verifyPassword("AdjusterDeskDemo123!", passwordHash), true);
    assert.equal(verifyPassword("wrong-password", passwordHash), false);
  });
});

describe("signed session helpers", () => {
  it("validates a signed session value", () => {
    const secret = "local-test-secret";
    const now = Date.UTC(2026, 4, 26, 12, 0, 0);
    const sessionValue = createSignedSessionValue("user_123", secret, now);

    assert.deepEqual(verifySignedSessionValue(sessionValue, secret, now), {
      userId: "user_123",
      exp: now + 1000 * 60 * 60 * 24 * 14,
    });
  });

  it("rejects a tampered session value", () => {
    const secret = "local-test-secret";
    const sessionValue = createSignedSessionValue("user_123", secret);
    const [payload, signature] = sessionValue.split(".");
    const tamperedValue = `${payload}.${signature.slice(0, -1)}x`;

    assert.equal(verifySignedSessionValue(tamperedValue, secret), null);
  });

  it("rejects an expired session value", () => {
    const secret = "local-test-secret";
    const now = Date.UTC(2026, 4, 26, 12, 0, 0);
    const sessionValue = createSignedSessionValue("user_123", secret, now);
    const expiredNow = now + 1000 * 60 * 60 * 24 * 15;

    assert.equal(verifySignedSessionValue(sessionValue, secret, expiredNow), null);
  });
});

describe("password reset token helpers", () => {
  it("creates a random token value", () => {
    const tokenA = createPasswordResetTokenValue();
    const tokenB = createPasswordResetTokenValue();

    assert.notEqual(tokenA, tokenB);
    assert.ok(tokenA.length >= 32);
  });

  it("hashes token values consistently", () => {
    const token = "sample-reset-token";
    const firstHash = hashPasswordResetToken(token);
    const secondHash = hashPasswordResetToken(token);

    assert.equal(firstHash, secondHash);
    assert.equal(firstHash.length, 64);
  });
});

describe("user invitation token config", () => {
  it("uses the default invitation token duration when env is missing", () => {
    const previous = process.env.USER_INVITATION_TOKEN_MINUTES;
    delete process.env.USER_INVITATION_TOKEN_MINUTES;

    const value = resolveUserInvitationTokenMinutes();

    assert.equal(value, 60 * 24 * 3);

    if (previous !== undefined) {
      process.env.USER_INVITATION_TOKEN_MINUTES = previous;
    }
  });
});