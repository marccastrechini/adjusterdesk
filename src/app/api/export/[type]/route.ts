import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { getAuthenticatedAppContext } from "@/lib/app-context";
import { formatDate, formatMoney, fullName, invoiceAmountDue, isInvoiceOverdue, labelFromEnum, propertyAddress } from "@/lib/format";
import { getClaims, getLeads, getMoneyData } from "@/lib/queries";

type RouteContext = { params: Promise<{ type: string }> };

export const dynamic = "force-dynamic";

function csvResponse(fileName: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}

function firstValue(value: string | null) {
  return value ?? undefined;
}

function dayStamp(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

function isOpenInvoice(invoice: { status: string }) {
  return !["PAID", "WRITTEN_OFF"].includes(invoice.status);
}

function isPaidInvoice(invoice: { status: string; feeAmountCents: number; amountPaidCents: number }) {
  return invoice.status === "PAID" || invoice.status === "WRITTEN_OFF" || invoiceAmountDue(invoice) === 0;
}

function isDueSoonInvoice(invoice: {
  status: string;
  dueAt?: Date | string | null;
  feeAmountCents: number;
  amountPaidCents: number;
}) {
  if (!invoice.dueAt || !isOpenInvoice(invoice) || isInvoiceOverdue(invoice)) return false;
  const due = new Date(invoice.dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);
  return due >= today && due <= soon;
}

export async function GET(request: Request, context: RouteContext) {
  const authContext = await getAuthenticatedAppContext();
  if (!authContext) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { type } = await context.params;
  const requestUrl = new URL(request.url);
  const q = firstValue(requestUrl.searchParams.get("q"))?.trim();
  const status = firstValue(requestUrl.searchParams.get("status"))?.trim() ?? "ALL";
  const assignedUserId = firstValue(requestUrl.searchParams.get("assignedUserId"))?.trim() ?? "ALL";
  const carrierId = firstValue(requestUrl.searchParams.get("carrierId"))?.trim() ?? "ALL";
  const followUp = firstValue(requestUrl.searchParams.get("followUp"))?.trim() ?? "ALL";
  const bucket = firstValue(requestUrl.searchParams.get("bucket"))?.trim() ?? "ALL";

  if (type === "leads") {
    const { leads } = await getLeads({
      q,
      status,
    });
    const todayStamp = dayStamp(new Date());
    const filteredLeads = leads.filter((lead) => {
      const matchesAssignedUser = assignedUserId === "ALL" || lead.assignedUserId === assignedUserId;
      const followUpStamp = lead.followUpDate ? dayStamp(lead.followUpDate) : null;
      const matchesFollowUp =
        followUp === "ALL" ||
        (followUp === "NO_DATE" && followUpStamp === null) ||
        (followUp === "OVERDUE" && followUpStamp !== null && followUpStamp < todayStamp) ||
        (followUp === "TODAY" && followUpStamp !== null && followUpStamp === todayStamp) ||
        (followUp === "UPCOMING" && followUpStamp !== null && followUpStamp > todayStamp);

      return matchesAssignedUser && matchesFollowUp;
    });

    return csvResponse(
      "adjusterdesk-leads.csv",
      toCsv(
        ["Client", "Property", "Source", "Referral source", "Loss type", "Status", "Assigned user", "Follow-up date"],
        filteredLeads.map((lead) => [
          fullName(lead.contact),
          propertyAddress(lead.property),
          lead.source,
          lead.referralSource,
          lead.lossType,
          labelFromEnum(lead.status),
          lead.assignedUser?.name,
          formatDate(lead.followUpDate),
        ]),
      ),
    );
  }

  if (type === "claims") {
    const { claims } = await getClaims({
      q,
      status,
    });
    const filteredClaims = claims.filter((claim) => {
      const matchesAssignedUser = assignedUserId === "ALL" || claim.assignedUserId === assignedUserId;
      const matchesCarrier = carrierId === "ALL" || claim.carrierId === carrierId;
      return matchesAssignedUser && matchesCarrier;
    });

    return csvResponse(
      "adjusterdesk-claims.csv",
      toCsv(
        ["Client", "Property", "Claim number", "Carrier", "Loss type", "Status", "Assigned user", "Updated at"],
        filteredClaims.map((claim) => [
          fullName(claim.contact),
          propertyAddress(claim.property),
          claim.claimNumber,
          claim.carrier?.name,
          claim.lossType,
          labelFromEnum(claim.status),
          claim.assignedUser?.name,
          formatDate(claim.updatedAt),
        ]),
      ),
    );
  }

  if (type === "invoices") {
    const { invoices } = await getMoneyData();
    const normalizedQuery = q?.toLowerCase() ?? "";
    const filteredInvoices = invoices.filter((invoice) => {
      const matchesQuery =
        !q ||
        [
          invoice.invoiceNumber,
          fullName(invoice.claim.contact),
          propertyAddress(invoice.claim.property),
          invoice.claim.claimNumber ?? "",
          invoice.claim.carrier?.name ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesStatus = status === "ALL" || invoice.status === status;

      const matchesBucket =
        bucket === "ALL" ||
        (bucket === "OVERDUE" && isInvoiceOverdue(invoice)) ||
        (bucket === "DUE_SOON" && isDueSoonInvoice(invoice)) ||
        (bucket === "PAID" && isPaidInvoice(invoice)) ||
        (bucket === "UNPAID" && isOpenInvoice(invoice) && invoiceAmountDue(invoice) > 0);

      return matchesQuery && matchesStatus && matchesBucket;
    });

    return csvResponse(
      "adjusterdesk-invoices.csv",
      toCsv(
        ["Invoice number", "Client", "Claim number", "Status", "Settlement amount", "Fee amount", "Amount paid", "Balance due", "Due date"],
        filteredInvoices.map((invoice) => [
          invoice.invoiceNumber,
          fullName(invoice.claim.contact),
          invoice.claim.claimNumber,
          labelFromEnum(invoice.status),
          formatMoney(invoice.settlementAmountCents),
          formatMoney(invoice.feeAmountCents),
          formatMoney(invoice.amountPaidCents),
          formatMoney(invoiceAmountDue(invoice)),
          formatDate(invoice.dueAt),
        ]),
      ),
    );
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
}
