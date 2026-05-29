/**
 * Pure helper functions for report summaries.
 * No database access — all inputs are plain value objects so these are testable without mocking Prisma.
 */

export type SettlementMonthRow = {
  /** YYYY-MM format for sorting */
  monthKey: string;
  /** Human-readable label, e.g. "May 2026" */
  monthLabel: string;
  count: number;
  totalCents: number;
};

type SettlementDateSource = {
  acceptedAmountCents?: number | null;
  offeredAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Groups a list of accepted settlement rounds by calendar month.
 * Uses offeredAt when available, falls back to updatedAt or createdAt.
 * Returns rows sorted newest-first.
 */
export function buildSettlementsByMonth(settlements: SettlementDateSource[]): SettlementMonthRow[] {
  const map = new Map<string, { label: string; count: number; totalCents: number }>();

  for (const s of settlements) {
    const date = toDate(s.offeredAt) ?? toDate(s.updatedAt) ?? toDate(s.createdAt);
    if (!date) continue;

    const key = monthKey(date);
    const existing = map.get(key);
    const cents = s.acceptedAmountCents ?? 0;

    if (existing) {
      existing.count += 1;
      existing.totalCents += cents;
    } else {
      map.set(key, { label: monthLabel(date), count: 1, totalCents: cents });
    }
  }

  return Array.from(map.entries())
    .map(([key, val]) => ({ monthKey: key, monthLabel: val.label, count: val.count, totalCents: val.totalCents }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

type InvoiceBalance = { feeAmountCents: number; amountPaidCents: number };

/**
 * Sums the outstanding balance (fee minus paid) across a list of invoices.
 */
export function totalOutstandingCents(invoices: InvoiceBalance[]): number {
  return invoices.reduce((sum, inv) => sum + Math.max(0, inv.feeAmountCents - inv.amountPaidCents), 0);
}

/**
 * Returns true when a task dueDate is strictly before the start of today.
 */
export function isTaskOverdue(dueDate: Date | string | null | undefined, now: Date): boolean {
  const d = toDate(dueDate);
  if (!d) return false;
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d < startOfToday;
}

/**
 * Returns true when a deadline falls on or after today and within the next withinDays days.
 */
export function isUpcomingDeadline(
  deadlineDate: Date | string | null | undefined,
  now: Date,
  withinDays: number,
): boolean {
  const d = toDate(deadlineDate);
  if (!d) return false;
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const horizon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + withinDays));
  return d >= startOfToday && d <= horizon;
}

type LeadSourceItem = { source: string };

/**
 * Groups a list of items by their source string and returns counts, sorted descending.
 */
export function groupBySource(items: LeadSourceItem[]): Array<{ source: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.source, (map.get(item.source) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

/**
 * Calculates the average number of days between two paired dates.
 * Pairs where either date is null are skipped.
 */
export function averageDaysBetween(
  pairs: Array<{ from: Date | string | null | undefined; to: Date | string | null | undefined }>,
): number | null {
  const diffs: number[] = [];
  for (const { from, to } of pairs) {
    const f = toDate(from);
    const t = toDate(to);
    if (!f || !t) continue;
    const diffMs = t.getTime() - f.getTime();
    if (diffMs >= 0) diffs.push(diffMs / 86_400_000);
  }
  if (diffs.length === 0) return null;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}
