import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { invoiceAmountDue, invoiceDisplayStatus, invoiceStatusTone, labelFromEnum } from "./format";

describe("invoice helpers", () => {
  it("calculates remaining fee balances without going below zero", () => {
    assert.equal(invoiceAmountDue({ feeAmountCents: 440000, amountPaidCents: 120000 }), 320000);
    assert.equal(invoiceAmountDue({ feeAmountCents: 360000, amountPaidCents: 500000 }), 0);
  });

  it("labels past-due sent invoices for the office worklist", () => {
    const invoice = {
      status: "SENT",
      dueAt: new Date("2024-01-01T12:00:00Z"),
      feeAmountCents: 100000,
      amountPaidCents: 0,
    };

    assert.equal(invoiceDisplayStatus(invoice), "Sent, overdue");
    assert.equal(invoiceStatusTone(invoice), "red");
  });

  it("turns stored enum values into plain labels", () => {
    assert.equal(labelFromEnum("WAITING_ON_CARRIER"), "Waiting On Carrier");
    assert.equal(labelFromEnum(null), "Not set");
  });
});