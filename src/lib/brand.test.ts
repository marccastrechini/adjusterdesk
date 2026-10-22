import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminEmail,
  brandFromAddress,
  brandName,
  brandNameTM,
  canonicalOrigin,
  defaultSystemEmailFrom,
  isOperatorEmailAddress,
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

  it("uses the paclaimboard.com mailboxes", () => {
    assert.equal(supportEmail, "hello@paclaimboard.com");
    assert.equal(adminEmail, "admin@paclaimboard.com");
    assert.equal(defaultSystemEmailFrom, "PA ClaimBoard <hello@paclaimboard.com>");
  });

  it("blocks both admin mailboxes as a sender and accepts both operator domains", () => {
    for (const admin of ["admin@paclaimboard.com", "admin@adjusterdesk.xyz"]) {
      const fromAdmin = resolveBrandFromHeader(`AdjusterDesk <${admin}>`);
      assert.equal(fromAdmin.from, defaultSystemEmailFrom);
      assert.equal(fromAdmin.fromEmail, supportEmail);
      assert.equal(resolveBrandReplyTo(admin), supportEmail);
      assert.equal(isOperatorEmailAddress(admin), false);
    }
    assert.equal(resolveBrandReplyTo(undefined), supportEmail);
    assert.equal(isOperatorEmailAddress("jenn@paclaimboard.com"), true);
    assert.equal(isOperatorEmailAddress("jenn@adjusterdesk.xyz"), true);
    assert.equal(isOperatorEmailAddress("jenn@example.com"), false);
  });

  it("preserves a custom display name and encodes mailto subjects", () => {
    const from = resolveBrandFromHeader(`Jenn <${supportEmail}>`);
    assert.equal(from.from, brandFromAddress(supportEmail).replace(brandName, "Jenn"));
    assert.equal(from.fromEmail, supportEmail);
    assert.equal(supportMailto(), `mailto:${supportEmail}`);
    assert.equal(supportMailto("PA ClaimBoard demo request"), `mailto:${supportEmail}?subject=PA%20ClaimBoard%20demo%20request`);
  });
});
