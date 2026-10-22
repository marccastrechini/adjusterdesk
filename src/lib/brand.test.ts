import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminEmail,
  brandFromAddress,
  brandName,
  brandNameTM,
  canonicalOrigin,
  defaultSystemEmailFrom,
  resolveBrandFromHeader,
  resolveBrandReplyTo,
  supportEmail,
  supportMailto,
} from "./brand";

describe("brand config", () => {
  it("publishes the new name and canonical origin", () => {
    assert.equal(brandName, "PA ClaimBoard");
    assert.equal(brandNameTM, "PA ClaimBoard™");
    assert.equal(brandNameTM.includes("®"), false);
    assert.equal(canonicalOrigin, "https://paclaimboard.com");
  });

  it("keeps the working mailboxes", () => {
    assert.equal(supportEmail, "hello@adjusterdesk.xyz");
    assert.equal(adminEmail, "admin@adjusterdesk.xyz");
    assert.equal(defaultSystemEmailFrom, "PA ClaimBoard <hello@adjusterdesk.xyz>");
  });

  it("rewrites a retired display name and does not send as the admin mailbox", () => {
    const fromAdmin = resolveBrandFromHeader("AdjusterDesk <admin@adjusterdesk.xyz>");
    assert.equal(fromAdmin.from, defaultSystemEmailFrom);
    assert.equal(fromAdmin.fromEmail, supportEmail);
    assert.equal(resolveBrandReplyTo("admin@adjusterdesk.xyz"), supportEmail);
    assert.equal(resolveBrandReplyTo(undefined), supportEmail);
  });

  it("preserves a custom display name and encodes mailto subjects", () => {
    const from = resolveBrandFromHeader(`Jenn <${supportEmail}>`);
    assert.equal(from.from, brandFromAddress(supportEmail).replace(brandName, "Jenn"));
    assert.equal(from.fromEmail, supportEmail);
    assert.equal(supportMailto(), `mailto:${supportEmail}`);
    assert.equal(supportMailto("PA ClaimBoard demo request"), `mailto:${supportEmail}?subject=PA%20ClaimBoard%20demo%20request`);
  });
});
