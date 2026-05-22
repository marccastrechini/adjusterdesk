const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatDate(date?: Date | string | null) {
  if (!date) return "Not set";
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date?: Date | string | null) {
  if (!date) return "Not set";
  return dateTimeFormatter.format(new Date(date));
}

export function formatMoney(cents?: number | null) {
  if (cents === null || cents === undefined) return "$0";
  return moneyFormatter.format(cents / 100);
}

export function formatPercentFromBasisPoints(basisPoints?: number | null) {
  if (basisPoints === null || basisPoints === undefined) return "0%";
  return `${basisPoints / 100}%`;
}

export function fullName(contact?: { firstName: string; lastName: string } | null) {
  if (!contact) return "Unknown client";
  return `${contact.firstName} ${contact.lastName}`;
}

export function propertyAddress(
  property?: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null,
) {
  if (!property) return "No property";
  return [
    property.address1,
    property.address2,
    `${property.city}, ${property.state} ${property.postalCode}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export function labelFromEnum(value?: string | null) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function invoiceAmountDue(invoice: { feeAmountCents: number; amountPaidCents: number }) {
  return Math.max(invoice.feeAmountCents - invoice.amountPaidCents, 0);
}

export function isInvoiceOverdue(invoice: {
  status: string;
  dueAt?: Date | string | null;
  feeAmountCents: number;
  amountPaidCents: number;
}) {
  return !["PAID", "WRITTEN_OFF"].includes(invoice.status) && invoiceAmountDue(invoice) > 0 && isPastDue(invoice.dueAt);
}

export function invoiceDisplayStatus(invoice: {
  status: string;
  dueAt?: Date | string | null;
  feeAmountCents: number;
  amountPaidCents: number;
}) {
  const status = labelFromEnum(invoice.status);
  if (invoice.status === "OVERDUE") return status;
  return isInvoiceOverdue(invoice) ? `${status}, overdue` : status;
}

export function invoiceStatusTone(invoice: {
  status: string;
  dueAt?: Date | string | null;
  feeAmountCents: number;
  amountPaidCents: number;
}) {
  if (invoice.status === "PAID") return "green";
  if (isInvoiceOverdue(invoice) || invoice.status === "OVERDUE") return "red";
  if (invoice.status === "DRAFT") return "slate";
  return "amber";
}

export function isPastDue(date?: Date | string | null) {
  if (!date) return false;
  const due = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function addDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}
