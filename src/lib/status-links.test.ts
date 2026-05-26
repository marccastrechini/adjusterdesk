import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientStatusPath, generateClientStatusToken, isClientStatusToken } from "./status-links";

describe("client status links", () => {
  it("generates URL-safe client status tokens", () => {
    const token = generateClientStatusToken();

    assert.equal(isClientStatusToken(token), true);
    assert.doesNotMatch(token, /[+/=]/);
  });

  it("rejects unsafe token text", () => {
    assert.equal(isClientStatusToken("short"), false);
    assert.equal(isClientStatusToken("../../not-safe-token-value"), false);
  });

  it("builds the status path for a token", () => {
    assert.equal(clientStatusPath("abc123abc123abc123abc123"), "/status/abc123abc123abc123abc123");
  });
});