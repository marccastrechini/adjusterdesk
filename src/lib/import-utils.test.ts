import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasUsableCsvRows, importTemplateCsv, normalizeImportType } from "./import-utils";

describe("import utils", () => {
  it("normalizes supported import types", () => {
    assert.equal(normalizeImportType("leads"), "leads");
    assert.equal(normalizeImportType("claims"), "claims");
    assert.equal(normalizeImportType(""), undefined);
    assert.equal(normalizeImportType("foo"), undefined);
  });

  it("detects usable csv rows", () => {
    assert.equal(hasUsableCsvRows([]), false);
    assert.equal(hasUsableCsvRows([{ firstName: "", lastName: " " }]), false);
    assert.equal(hasUsableCsvRows([{ firstName: "Jamie", lastName: "Cole" }]), true);
  });

  it("builds lead and claim sample csv templates", () => {
    const leadsCsv = importTemplateCsv("leads");
    const claimsCsv = importTemplateCsv("claims");

    assert.match(leadsCsv.split("\n")[0], /firstName,lastName,email/);
    assert.match(claimsCsv.split("\n")[0], /firstName,lastName,email/);
    assert.match(claimsCsv.split("\n")[0], /carrierName,policyNumber,claimNumber/);
  });
});
