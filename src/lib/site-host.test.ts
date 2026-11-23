import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalHost } from "@/lib/brand";
import { isProductionAnalyticsHost, isSandboxHost, requestHostname } from "@/lib/site-host";

test("production analytics host is only the public site", () => {
  assert.equal(isProductionAnalyticsHost(canonicalHost), true);
  assert.equal(isProductionAnalyticsHost(`www.${canonicalHost}`), true);
  assert.equal(isProductionAnalyticsHost("sandbox.paclaimboard.com"), false);
  assert.equal(isProductionAnalyticsHost("localhost"), false);
  assert.equal(isProductionAnalyticsHost("adjusterdesk.xyz"), false);
});

test("sandbox is any host label, including a port and a forwarded host", () => {
  assert.equal(isSandboxHost("sandbox.paclaimboard.com"), true);
  assert.equal(isSandboxHost("www.sandbox.paclaimboard.com"), true);
  assert.equal(isSandboxHost(canonicalHost), false);
  assert.equal(requestHostname("origin.internal:3000", "sandbox.paclaimboard.com, proxy.internal"), "sandbox.paclaimboard.com");
  assert.equal(requestHostname("sandbox.paclaimboard.com:443", null), "sandbox.paclaimboard.com");
  assert.equal(requestHostname("paclaimboard.com", "origin.internal"), "paclaimboard.com");
  assert.equal(isSandboxHost(requestHostname("paclaimboard.com", "sandbox.paclaimboard.com")), true);
});
