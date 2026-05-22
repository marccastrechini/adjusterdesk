import { NextResponse } from "next/server";
import { getDemoContext } from "@/lib/app-context";
import { toCsv } from "@/lib/csv";
import { formatDate, formatMoney, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { prisma } from "@/lib/prisma";

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

export async function GET(_request: Request, context: RouteContext) {
  const { type } = await context.params;
  const { firm } = await getDemoContext();

  if (type === "leads") {
    const leads = await prisma.lead.findMany({
      where: { firmId: firm.id },
      include: { contact: true, property: true, assignedUser: true },
      orderBy: { createdAt: "desc" },
    });

    return csvResponse(
      "adjusterdesk-leads.csv",
      toCsv(
        ["Client", "Email", "Phone", "Property", "Source", "Referral Source", "Loss Type", "Date of Loss", "Status", "Follow-up", "Assigned Adjuster", "Notes"],
        leads.map((lead) => [
          fullName(lead.contact),
          lead.contact.email,
          lead.contact.phone,
          propertyAddress(lead.property),
          lead.source,
          lead.referralSource,
          lead.lossType,
          formatDate(lead.dateOfLoss),
          labelFromEnum(lead.status),
          formatDate(lead.followUpDate),
          lead.assignedUser?.name,
          lead.notes,
        ]),
      ),
    );
  }

  if (type === "claims") {
    const claims = await prisma.claim.findMany({
      where: { firmId: firm.id },
      include: { contact: true, property: true, carrier: true, policy: true, assignedUser: true },
      orderBy: { updatedAt: "desc" },
    });

    return csvResponse(
      "adjusterdesk-claims.csv",
      toCsv(
        ["Client", "Email", "Phone", "Property", "Carrier", "Policy", "Claim Number", "Loss Type", "Date of Loss", "Status", "Deadline", "Assigned Adjuster", "Next Step"],
        claims.map((claim) => [
          fullName(claim.contact),
          claim.contact.email,
          claim.contact.phone,
          propertyAddress(claim.property),
          claim.carrier?.name,
          claim.policy?.policyNumber,
          claim.claimNumber,
          claim.lossType,
          formatDate(claim.dateOfLoss),
          labelFromEnum(claim.status),
          formatDate(claim.deadlineDate),
          claim.assignedUser?.name,
          claim.nextStep,
        ]),
      ),
    );
  }

  if (type === "invoices") {
    const invoices = await prisma.invoice.findMany({
      where: { firmId: firm.id },
      include: { claim: { include: { contact: true, property: true } } },
      orderBy: { createdAt: "desc" },
    });

    return csvResponse(
      "adjusterdesk-invoices.csv",
      toCsv(
        ["Invoice", "Client", "Property", "Status", "Settlement Amount", "Fee Amount", "Amount Paid", "Open Amount", "Issued", "Due"],
        invoices.map((invoice) => [
          invoice.invoiceNumber,
          fullName(invoice.claim.contact),
          propertyAddress(invoice.claim.property),
          labelFromEnum(invoice.status),
          formatMoney(invoice.settlementAmountCents),
          formatMoney(invoice.feeAmountCents),
          formatMoney(invoice.amountPaidCents),
          formatMoney(invoice.feeAmountCents - invoice.amountPaidCents),
          formatDate(invoice.issuedAt),
          formatDate(invoice.dueAt),
        ]),
      ),
    );
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
}
