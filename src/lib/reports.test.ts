import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averageDaysBetween,
  buildSettlementsByMonth,
  groupBySource,
  isTaskOverdue,
  isUpcomingDeadline,
  totalOutstandingCents,
} from "./reports";

describe("report helpers", () => {
  it("groups settlements by month newest-first", () => {
    const rows = buildSettlementsByMonth([
      { acceptedAmountCents: 50000, offeredAt: "2026-05-10T00:00:00.000Z" },
      { acceptedAmountCents: 75000, offeredAt: "2026-05-22T00:00:00.000Z" },
      { acceptedAmountCents: 120000, offeredAt: "2026-04-05T00:00:00.000Z" },
      { acceptedAmountCents: null, offeredAt: "2026-03-15T00:00:00.000Z" },
    ]);

    assert.equal(rows.length, 3);
    assert.equal(rows[0].monthKey, "2026-05");
    assert.equal(rows[0].count, 2);
    assert.equal(rows[0].totalCents, 125000);
    assert.equal(rows[1].monthKey, "2026-04");
    assert.equal(rows[1].totalCents, 120000);
    assert.equal(rows[2].monthKey, "2026-03");
    assert.equal(rows[2].totalCents, 0);
  });

  it("returns empty array when no settlements", () => {
    assert.deepEqual(buildSettlementsByMonth([]), []);
  });

  it("falls back to updatedAt when offeredAt is missing", () => {
    const rows = buildSettlementsByMonth([
      { acceptedAmountCents: 40000, offeredAt: null, updatedAt: "2026-02-14T00:00:00.000Z" },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].monthKey, "2026-02");
  });

  it("sums outstanding invoice balances", () => {
    const invoices = [
      { feeAmountCents: 10000, amountPaidCents: 3000 },
      { feeAmountCents: 5000, amountPaidCents: 5000 },  // fully paid
      { feeAmountCents: 8000, amountPaidCents: 0 },
    ];
    assert.equal(totalOutstandingCents(invoices), 15000);
  });

  it("returns 0 for empty invoices", () => {
    assert.equal(totalOutstandingCents([]), 0);
  });

  it("detects overdue tasks correctly", () => {
    const today = new Date("2026-05-29T10:00:00.000Z");
    assert.equal(isTaskOverdue("2026-05-28T00:00:00.000Z", today), true);
    assert.equal(isTaskOverdue("2026-05-29T00:00:00.000Z", today), false);  // today is not overdue
    assert.equal(isTaskOverdue("2026-05-30T00:00:00.000Z", today), false);
    assert.equal(isTaskOverdue(null, today), false);
  });

  it("detects upcoming deadlines within a window", () => {
    const today = new Date("2026-05-29T10:00:00.000Z");
    assert.equal(isUpcomingDeadline("2026-05-29T00:00:00.000Z", today, 30), true);   // today = upcoming
    assert.equal(isUpcomingDeadline("2026-06-15T00:00:00.000Z", today, 30), true);
    assert.equal(isUpcomingDeadline("2026-07-01T00:00:00.000Z", today, 30), false);  // beyond window
    assert.equal(isUpcomingDeadline("2026-05-28T00:00:00.000Z", today, 30), false);  // past
    assert.equal(isUpcomingDeadline(null, today, 30), false);
  });

  it("groups items by source descending by count", () => {
    const groups = groupBySource([
      { source: "Referral" },
      { source: "Website" },
      { source: "Referral" },
      { source: "Referral" },
      { source: "Website" },
    ]);
    assert.equal(groups[0].source, "Referral");
    assert.equal(groups[0].count, 3);
    assert.equal(groups[1].source, "Website");
    assert.equal(groups[1].count, 2);
  });

  it("averages days between paired dates", () => {
    const avg = averageDaysBetween([
      { from: "2026-01-01T00:00:00.000Z", to: "2026-01-11T00:00:00.000Z" },  // 10 days
      { from: "2026-01-01T00:00:00.000Z", to: "2026-01-21T00:00:00.000Z" },  // 20 days
    ]);
    assert.equal(avg, 15);
  });

  it("returns null average for empty or null-only pairs", () => {
    assert.equal(averageDaysBetween([]), null);
    assert.equal(averageDaysBetween([{ from: null, to: "2026-01-01T00:00:00.000Z" }]), null);
  });

  it("computes lead-to-claim timing (skips pairs with null claim)", () => {
    const pairs = [
      { from: "2026-01-01T00:00:00.000Z", to: "2026-01-11T00:00:00.000Z" }, // 10 days
      { from: "2026-02-01T00:00:00.000Z", to: null },  // converted lead with deleted claim — skip
      { from: "2026-03-01T00:00:00.000Z", to: "2026-03-21T00:00:00.000Z" }, // 20 days
    ];
    const avg = averageDaysBetween(pairs);
    assert.equal(avg, 15);
  });

  it("computes claim-to-settlement timing using offeredAt fallback to createdAt", () => {
    const pairs = [
      { from: "2026-01-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z" }, // 90 days
      { from: "2026-02-01T00:00:00.000Z", to: "2026-03-03T00:00:00.000Z" }, // 30 days
    ];
    const avg = averageDaysBetween(pairs);
    assert.equal(avg, 60);
  });
});
