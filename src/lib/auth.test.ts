import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSignedSessionValue, hashPassword, verifyPassword, verifySignedSessionValue } from "./auth";

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