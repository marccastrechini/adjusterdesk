import { notFound } from "next/navigation";
import {
  ClaimStatus,
  InvoiceStatus,
  LeadStatus,
  TaskStatus,
  type Carrier,
  type Claim,
  type Contact,
  type Invoice,
  type Lead,
  type Property,
  type Task,
  type User,
} from "@/generated/prisma/client";
import { getDemoContext } from "@/lib/app-context";
import { addDays, todayRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type SearchInput = Record<string, string | string[] | undefined>;

type LeadListItem = Lead & {
  contact: Contact;
  property: Property;
  assignedUser: User | null;
  convertedClaim: Claim | null;
};

type ClaimListItem = Claim & {
  contact: Contact;
  property: Property;
  carrier: Carrier | null;
  assignedUser: User | null;
  invoices: Invoice[];
  tasks: Task[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getTodayData() {
  const { firm, user, users } = await getDemoContext();
  const { start, end } = todayRange();
  const upcomingEnd = addDays(14);

  const [overdueTasks, dueTodayTasks, upcomingTasks, upcomingDeadlines, waitingOnCarrierClaims, unpaidInvoices, recentClaims] =
    await Promise.all([
      prisma.task.findMany({
        where: { firmId: firm.id, status: TaskStatus.OPEN, dueDate: { lt: start } },
        include: { claim: { include: { contact: true } }, lead: { include: { contact: true } }, assignedUser: true },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      prisma.task.findMany({
        where: { firmId: firm.id, status: TaskStatus.OPEN, dueDate: { gte: start, lt: end } },
        include: { claim: { include: { contact: true } }, lead: { include: { contact: true } }, assignedUser: true },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      prisma.task.findMany({
        where: { firmId: firm.id, status: TaskStatus.OPEN, dueDate: { gte: end, lte: upcomingEnd } },
        include: { claim: { include: { contact: true } }, lead: { include: { contact: true } }, assignedUser: true },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      prisma.claim.findMany({
        where: { firmId: firm.id, status: { notIn: [ClaimStatus.CLOSED] }, deadlineDate: { gte: start, lte: addDays(30) } },
        include: { contact: true, property: true, assignedUser: true },
        orderBy: { deadlineDate: "asc" },
        take: 8,
      }),
      prisma.claim.findMany({
        where: { firmId: firm.id, status: ClaimStatus.WAITING_ON_CARRIER },
        include: { contact: true, carrier: true, assignedUser: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.invoice.findMany({
        where: { firmId: firm.id, status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
        include: { claim: { include: { contact: true } } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.claim.findMany({
        where: { firmId: firm.id },
        include: { contact: true, property: true, assignedUser: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
    ]);

  return {
    firm,
    user,
    users,
    overdueTasks,
    dueTodayTasks,
    upcomingTasks,
    upcomingDeadlines,
    waitingOnCarrierClaims,
    unpaidInvoices,
    recentClaims,
  };
}

export async function getLeads(params: SearchInput = {}) {
  const { firm, users } = await getDemoContext();
  const search = firstValue(params.q)?.trim();
  const status = firstValue(params.status);

  const leads = (await prisma.lead.findMany({
    where: {
      firmId: firm.id,
      ...(status && status !== "ALL" ? { status: status as LeadStatus } : {}),
      ...(search
        ? {
            OR: [
              { source: { contains: search } },
              { referralSource: { contains: search } },
              { lossType: { contains: search } },
              { contact: { firstName: { contains: search } } },
              { contact: { lastName: { contains: search } } },
              { property: { address1: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { contact: true, property: true, assignedUser: true, convertedClaim: true },
    orderBy: [{ status: "asc" }, { followUpDate: "asc" }, { createdAt: "desc" }],
  })) as LeadListItem[];

  return { firm, users, leads, search, status: status ?? "ALL" };
}

export async function getLead(id: string) {
  const { firm, users } = await getDemoContext();
  const lead = await prisma.lead.findFirst({
    where: { id, firmId: firm.id },
    include: {
      contact: true,
      property: true,
      assignedUser: true,
      convertedClaim: true,
      tasks: { include: { assignedUser: true }, orderBy: { dueDate: "asc" } },
      activities: { include: { user: true, contact: true }, orderBy: { occurredAt: "desc" } },
      documents: { include: { uploadedByUser: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();
  return { firm, users, lead };
}

export async function getClaims(params: SearchInput = {}) {
  const { firm, users } = await getDemoContext();
  const search = firstValue(params.q)?.trim();
  const status = firstValue(params.status);

  const claims = (await prisma.claim.findMany({
    where: {
      firmId: firm.id,
      ...(status && status !== "ALL" ? { status: status as ClaimStatus } : {}),
      ...(search
        ? {
            OR: [
              { claimNumber: { contains: search } },
              { lossType: { contains: search } },
              { contact: { firstName: { contains: search } } },
              { contact: { lastName: { contains: search } } },
              { property: { address1: { contains: search } } },
              { carrier: { name: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { contact: true, property: true, carrier: true, assignedUser: true, invoices: true, tasks: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  })) as ClaimListItem[];

  return { firm, users, claims, search, status: status ?? "ALL" };
}

export async function getClaim(id: string) {
  const { firm, users } = await getDemoContext();
  const claim = await prisma.claim.findFirst({
    where: { id, firmId: firm.id },
    include: {
      contact: true,
      property: true,
      policy: { include: { carrier: true } },
      carrier: true,
      assignedUser: true,
      lead: true,
      tasks: { include: { assignedUser: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
      documents: { include: { uploadedByUser: true }, orderBy: { createdAt: "desc" } },
      activities: { include: { user: true, contact: true }, orderBy: { occurredAt: "desc" } },
      settlementRounds: { orderBy: { roundNumber: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      invoices: { include: { feeRule: true }, orderBy: { createdAt: "desc" } },
      statusLinks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!claim) notFound();
  return { firm, users, claim };
}

export async function getMoneyData() {
  const { firm } = await getDemoContext();
  const [invoices, payments, openInvoiceTotal, paidInvoiceTotal] = await Promise.all([
    prisma.invoice.findMany({
      where: { firmId: firm.id },
      include: { claim: { include: { contact: true, property: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    }),
    prisma.payment.findMany({
      where: { firmId: firm.id },
      include: { claim: { include: { contact: true } } },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
    prisma.invoice.aggregate({
      where: { firmId: firm.id, status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
      _sum: { feeAmountCents: true, amountPaidCents: true },
    }),
    prisma.invoice.aggregate({
      where: { firmId: firm.id, status: InvoiceStatus.PAID },
      _sum: { feeAmountCents: true },
    }),
  ]);

  const outstandingCents =
    (openInvoiceTotal._sum.feeAmountCents ?? 0) - (openInvoiceTotal._sum.amountPaidCents ?? 0);

  return { firm, invoices, payments, outstandingCents, paidInvoiceCents: paidInvoiceTotal._sum.feeAmountCents ?? 0 };
}

export async function getReportsData() {
  const { firm } = await getDemoContext();
  const { start } = todayRange();

  const [claimsByStatus, overdueTasks, upcomingDeadlines, leadsBySource, receivables] = await Promise.all([
    prisma.claim.groupBy({
      by: ["status"],
      where: { firmId: firm.id },
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.task.findMany({
      where: { firmId: firm.id, status: TaskStatus.OPEN, dueDate: { lt: start } },
      include: { claim: { include: { contact: true } }, lead: { include: { contact: true } }, assignedUser: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.claim.findMany({
      where: { firmId: firm.id, status: { notIn: [ClaimStatus.CLOSED] }, deadlineDate: { gte: start, lte: addDays(30) } },
      include: { contact: true, carrier: true },
      orderBy: { deadlineDate: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { firmId: firm.id },
      _count: { _all: true },
      orderBy: { source: "asc" },
    }),
    prisma.invoice.findMany({
      where: { firmId: firm.id, status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
      include: { claim: { include: { contact: true } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return { firm, claimsByStatus, overdueTasks, upcomingDeadlines, leadsBySource, receivables };
}

export async function getTemplates() {
  const { firm } = await getDemoContext();
  const templates = await prisma.template.findMany({
    where: { firmId: firm.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return { firm, templates };
}

export async function getUsers() {
  const { firm } = await getDemoContext();
  const users = await prisma.user.findMany({
    where: { firmId: firm.id },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });
  return { firm, users };
}

export async function getStatusPage(token: string) {
  const statusLink = await prisma.clientStatusLink.findUnique({
    where: { token },
    include: {
      firm: true,
      claim: {
        include: {
          contact: true,
          property: true,
          carrier: true,
          tasks: { where: { status: TaskStatus.OPEN }, orderBy: { dueDate: "asc" }, take: 3 },
          documents: { orderBy: { createdAt: "desc" } },
          activities: { include: { user: true }, orderBy: { occurredAt: "desc" }, take: 3 },
          invoices: { orderBy: { createdAt: "desc" }, take: 2 },
        },
      },
    },
  });

  if (!statusLink || !statusLink.isActive) notFound();

  await prisma.clientStatusLink.update({ where: { id: statusLink.id }, data: { lastViewedAt: new Date() } });

  return statusLink;
}
