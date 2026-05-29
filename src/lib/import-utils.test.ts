import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dateFromImportValue, hasUsableCsvRows, importTemplateCsv, normalizeImportType, parseImportCsv, validImportRows } from "./import-utils";

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

  it("builds a sample office lead import file", () => {
    const csv = importTemplateCsv("leads", "sample-office");
    const lines = csv.trim().split("\n");

    assert.equal(lines.length, 4);
    assert.match(csv, /Avery,Rowe/);
    assert.match(csv, /Marisol,Vega/);
  });

  it("previews valid lead rows with plain spreadsheet headings", () => {
    const csv = [
      "First Name,Last Name,Email,Phone,Property Address,City,State,Zip,Source,Referral Source,Loss Type,Date of Loss,Follow-up Date,Notes",
      "Jamie,Cole,jamie@example.com,(813) 555-0123,120 Bay Street,Tampa,FL,33602,Past client,Neighbor,Water damage,5/1/2026,2026-05-05,Call after 4 PM",
    ].join("\n");

    const preview = parseImportCsv(csv, "leads");

    assert.equal(preview.validCount, 1);
    assert.equal(preview.invalidCount, 0);
    assert.equal(preview.rows[0]?.values.dateOfLoss, "2026-05-01");
    assert.equal(validImportRows(preview).length, 1);
  });

  it("marks missing required columns and row values", () => {
    const csv = ["First Name,Last Name,Email", "Jamie,,not-an-email"].join("\n");
    const preview = parseImportCsv(csv, "leads");

    assert.deepEqual(preview.missingColumns, ["Property address", "City", "State", "ZIP", "Lead source", "Loss type"]);
    assert.equal(preview.validCount, 0);
    assert.equal(preview.invalidCount, 1);
    assert.match(preview.rows[0]?.errors.join(" "), /Add the client's last name/);
    assert.match(preview.rows[0]?.errors.join(" "), /Email does not look right/);
    assert.match(preview.rows[0]?.errors.join(" "), /Missing required columns/);
  });

  it("marks invalid dates and duplicate lead rows", () => {
    const csv = [
      "firstName,lastName,address1,city,state,postalCode,source,lossType,dateOfLoss",
      "Jamie,Cole,120 Bay Street,Tampa,FL,33602,Past client,Water damage,2/31/2026",
      "Jamie,Cole,120 Bay Street,Tampa,FL,33602,Past client,Water damage,2026-05-02",
    ].join("\n");

    const preview = parseImportCsv(csv, "leads");

    assert.equal(preview.validCount, 0);
    assert.equal(preview.invalidCount, 2);
    assert.match(preview.rows[0]?.errors.join(" "), /Use a real calendar date/);
    assert.match(preview.rows[1]?.errors.join(" "), /duplicate lead/);
  });

  it("marks duplicate claim numbers in the file and workspace", () => {
    const csv = [
      "firstName,lastName,address1,city,state,postalCode,claimNumber,lossType,dateOfLoss",
      "Jordan,Miles,88 Harbor Drive,St. Petersburg,FL,33701,SSI-26-00452,Wind,2026-04-28",
      "Avery,Rowe,114 Cypress Bend Drive,Tampa,FL,33602,SSI-26-00452,Water,2026-05-01",
      "Mina,Stone,14 Lake Street,Tampa,FL,33602,OPEN-123,Fire,2026-05-03",
    ].join("\n");

    const preview = parseImportCsv(csv, "claims", { existingClaimNumbers: ["OPEN-123"] });

    assert.equal(preview.validCount, 1);
    assert.equal(preview.invalidCount, 2);
    assert.match(preview.rows[1]?.errors.join(" "), /appears more than once/);
    assert.match(preview.rows[2]?.errors.join(" "), /already in this workspace/);
  });

  it("throws a plain error for malformed csv", () => {
    assert.throws(() => parseImportCsv('firstName,lastName\n"Jamie,Cole', "leads"));
  });

  it("turns normalized import dates into Date values", () => {
    const date = dateFromImportValue("2026-05-01");

    assert.equal(dateFromImportValue(undefined), undefined);
    assert.equal(date?.getFullYear(), 2026);
    assert.equal(date?.getMonth(), 4);
    assert.equal(date?.getDate(), 1);
  });
});
