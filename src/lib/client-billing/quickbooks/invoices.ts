import { ClientPaymentSource, InvoiceStatus, type Claim, type Contact, type Firm, type Invoice } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateClientPaymentFeeRecoveryCents } from "../fee-recovery";
import type { ClientBillingInvoiceResult } from "../types";
import { readIntuitConfig, type IntuitConfig } from "./config";
import { escapeQuickBooksLiteral, isQuickBooksEntityId, quickBooksClientForFirm, type IntuitFetcher, type QboAccount, type QboCustomer, type QboInvoice, type QboItem, type QboLinkedTxn, type QuickBooksClient } from "./client";
import { QuickBooksError } from "./errors";

const feeItemName = "Public adjusting fee";

type ClaimWithContact = Claim & { contact: Contact };

export function dollarsToCents(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100);
}

export function quickBooksInvoiceSnapshot(invoice: { TotalAmt?: number | null; Balance?: number | null }) {
  const totalCents = dollarsToCents(invoice.TotalAmt ?? 0);
  const balanceKnown = invoice.Balance !== undefined && invoice.Balance !== null;
  const balanceCents = balanceKnown ? dollarsToCents(invoice.Balance ?? 0) : totalCents;
  const paidCents = Math.max(totalCents - balanceCents, 0);
  let settlement: "paid" | "partial" | "open" = "open";
  if (balanceKnown && balanceCents <= 0 && totalCents > 0) {
    settlement = "paid";
  } else if (paidCents > 0) {
    settlement = "partial";
  }

  return { totalCents, balanceCents, paidCents, settlement };
}

function customerDisplayName(contact: Contact) {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return (name || contact.company?.trim() || "Client").slice(0, 500);
}

function payeeName(contact: Contact) {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return contact.company?.trim() || name || "Client";
}

function isoDate(value?: Date | null) {
  if (!value) {
    return undefined;
  }

  return value.toISOString().slice(0, 10);
}

function localInvoiceStatus(settlement: "paid" | "partial" | "open") {
  if (settlement === "paid") {
    return InvoiceStatus.PAID;
  }
  if (settlement === "partial") {
    return InvoiceStatus.PARTIALLY_PAID;
  }
  return InvoiceStatus.SENT;
}

function paymentReference(invoice: QboInvoice, paymentId?: string) {
  if (paymentId && isQuickBooksEntityId(paymentId)) {
    return paymentId;
  }

  const linked = (invoice.LinkedTxn ?? []).find((txn) => txn.TxnType === "Payment" && isQuickBooksEntityId(txn.TxnId));
  if (linked?.TxnId) {
    return linked.TxnId;
  }

  return invoice.Id ? `qbo-invoice-${invoice.Id}` : undefined;
}

async function rememberCustomer(contactId: string, customerId: string) {
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      externalBillingCustomerId: customerId,
      externalBillingProvider: "quickbooks",
    },
  });
}

async function findCustomerByEmail(client: QuickBooksClient, email: string) {
  try {
    const matches = await client.query<QboCustomer>(`select * from Customer where PrimaryEmailAddr = '${escapeQuickBooksLiteral(email)}' MAXRESULTS 10`, "Customer");
    return matches.find((customer) => customer.PrimaryEmailAddr?.Address?.toLowerCase() === email.toLowerCase()) ?? matches[0];
  } catch (error) {
    if (error instanceof QuickBooksError && error.status && error.status < 500) {
      return undefined;
    }
    throw error;
  }
}

async function findOrCreateCustomer(client: QuickBooksClient, contact: Contact) {
  if (contact.externalBillingProvider === "quickbooks" && isQuickBooksEntityId(contact.externalBillingCustomerId)) {
    try {
      const existing = await client.getCustomer(contact.externalBillingCustomerId);
      if (existing?.Id) {
        return existing.Id;
      }
    } catch (error) {
      if (!(error instanceof QuickBooksError) || (error.status !== 404 && error.code !== "610")) {
        throw error;
      }
    }
  }

  const email = contact.email?.trim();
  if (email) {
    const match = await findCustomerByEmail(client, email);
    if (match?.Id) {
      await rememberCustomer(contact.id, match.Id);
      return match.Id;
    }
  }

  const displayName = customerDisplayName(contact);
  const body = {
    DisplayName: displayName,
    GivenName: contact.firstName.trim().slice(0, 100) || undefined,
    FamilyName: contact.lastName.trim().slice(0, 100) || undefined,
    PrimaryEmailAddr: email ? { Address: email } : undefined,
    PrimaryPhone: contact.phone?.trim() ? { FreeFormNumber: contact.phone.trim() } : undefined,
    Notes: `PA ClaimBoard contact ${contact.id}`.slice(0, 2000),
  };

  try {
    const created = await client.createCustomer(body);
    await rememberCustomer(contact.id, created.Id!);
    return created.Id!;
  } catch (error) {
    if (!(error instanceof QuickBooksError) || error.code !== "6240") {
      throw error;
    }

    const created = await client.createCustomer({
      ...body,
      DisplayName: `${displayName} ${contact.id.slice(-6)}`.slice(0, 500),
    });
    await rememberCustomer(contact.id, created.Id!);
    return created.Id!;
  }
}

function pickIncomeAccount(accounts: QboAccount[]) {
  return accounts.find((account) => account.AccountSubType === "ServiceFeeIncome") ?? accounts.find((account) => account.AccountType === "Income") ?? accounts[0];
}

async function ensureFeeItem(client: QuickBooksClient, firm: Firm) {
  if (isQuickBooksEntityId(firm.quickbooksFeeItemId)) {
    try {
      const existing = await client.getItem(firm.quickbooksFeeItemId);
      if (existing?.Id) {
        return existing.Id;
      }
    } catch (error) {
      if (!(error instanceof QuickBooksError) || (error.status !== 404 && error.code !== "610")) {
        throw error;
      }
    }
  }

  let found: QboItem[] = [];
  try {
    found = await client.query<QboItem>(`select * from Item where Name = '${escapeQuickBooksLiteral(feeItemName)}' MAXRESULTS 10`, "Item");
  } catch (error) {
    if (!(error instanceof QuickBooksError) || !error.status || error.status >= 500) {
      throw error;
    }
  }
  const service = found.find((item) => item.Type === "Service") ?? found[0];
  if (service?.Id) {
    await prisma.firm.update({ where: { id: firm.id }, data: { quickbooksFeeItemId: service.Id } });
    firm.quickbooksFeeItemId = service.Id;
    return service.Id;
  }

  const accounts = await client.query<QboAccount>("select * from Account where AccountType = 'Income' MAXRESULTS 20", "Account");
  const account = pickIncomeAccount(accounts);
  if (!account?.Id) {
    throw new QuickBooksError("QuickBooks needs an income account before a fee item can be created.", "missing_income_account");
  }

  const created = await client.createItem({
    Name: feeItemName,
    Type: "Service",
    IncomeAccountRef: { value: account.Id },
  });
  const createdId = created.Id;
  if (!createdId) {
    throw new QuickBooksError("QuickBooks did not return an item.", "invalid_response");
  }
  await prisma.firm.update({ where: { id: firm.id }, data: { quickbooksFeeItemId: createdId } });
  firm.quickbooksFeeItemId = createdId;
  return createdId;
}

function salesLine(itemId: string, cents: number, description: string) {
  const amount = Number((cents / 100).toFixed(2));
  return {
    DetailType: "SalesItemLineDetail",
    Amount: amount,
    Description: description.slice(0, 4000),
    SalesItemLineDetail: {
      ItemRef: { value: itemId },
      Qty: 1,
      UnitPrice: amount,
    },
  };
}

function invoiceLines(firm: Firm, invoice: Invoice, claim: ClaimWithContact, itemId: string) {
  const claimLabel = claim.claimNumber?.trim() || claim.id;
  const lines = [salesLine(itemId, invoice.feeAmountCents, `Public adjuster fee for claim ${claimLabel} (invoice ${invoice.invoiceNumber})`)];
  const recoveryCents = calculateClientPaymentFeeRecoveryCents(firm, invoice.feeAmountCents);
  if (recoveryCents > 0) {
    lines.push(salesLine(itemId, recoveryCents, firm.clientPaymentFeeLabel?.trim() || "Client payment fee recovery"));
  }
  return lines;
}

function docNumber(invoiceNumber: string) {
  const trimmed = invoiceNumber.trim();
  if (trimmed.length >= 1 && trimmed.length <= 21) {
    return trimmed;
  }
  return undefined;
}

export function linkedInvoiceIds(lines: Array<{ LinkedTxn?: QboLinkedTxn[] }> | undefined) {
  const ids = new Set<string>();
  for (const line of lines ?? []) {
    for (const txn of line.LinkedTxn ?? []) {
      if (txn.TxnType === "Invoice" && isQuickBooksEntityId(txn.TxnId)) {
        ids.add(txn.TxnId);
      }
    }
  }
  return [...ids];
}

export async function applyQuickBooksInvoice(firm: Firm, invoice: Invoice, qboInvoice: QboInvoice, paymentId?: string): Promise<ClientBillingInvoiceResult> {
  const snapshot = quickBooksInvoiceSnapshot(qboInvoice);
  const claim = await prisma.claim.findUnique({
    where: { id: invoice.claimId },
    include: { contact: true },
  });
  if (!claim || claim.firmId !== firm.id) {
    return {
      invoiceId: qboInvoice.Id ?? invoice.externalInvoiceId ?? null,
      hostedInvoiceUrl: qboInvoice.InvoiceLink ?? invoice.externalHostedInvoiceUrl ?? null,
      pdfUrl: invoice.externalInvoicePdfUrl ?? null,
      status: snapshot.settlement,
      syncedAt: new Date(),
    };
  }

  const syncedAt = new Date();
  const nextStatus = localInvoiceStatus(snapshot.settlement);
  const externalPaymentId = snapshot.paidCents > 0 ? paymentReference(qboInvoice, paymentId) : undefined;
  const becamePaid = nextStatus === InvoiceStatus.PAID && invoice.status !== InvoiceStatus.PAID;
  const recordedNewPayment = snapshot.paidCents > 0 && snapshot.paidCents !== invoice.amountPaidCents;

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        clientBillingProvider: "QUICKBOOKS",
        status: invoice.status === InvoiceStatus.WRITTEN_OFF ? invoice.status : nextStatus,
        paidAt: nextStatus === InvoiceStatus.PAID ? invoice.paidAt ?? syncedAt : invoice.paidAt,
        amountPaidCents: snapshot.paidCents,
        externalInvoiceId: qboInvoice.Id ?? invoice.externalInvoiceId,
        externalInvoiceStatus: snapshot.settlement,
        externalHostedInvoiceUrl: qboInvoice.InvoiceLink ?? invoice.externalHostedInvoiceUrl,
        externalPaymentIntentId: externalPaymentId,
        externalAmountDueCents: snapshot.balanceCents,
        externalAmountPaidCents: snapshot.paidCents,
        externalSyncedAt: syncedAt,
      },
    });

    if (snapshot.paidCents > 0) {
      const existing = await tx.payment.findFirst({
        where: {
          firmId: invoice.firmId,
          invoiceId: invoice.id,
          externalProvider: "quickbooks",
        },
      });
      const paymentData = {
        source: ClientPaymentSource.QUICKBOOKS,
        amountCents: snapshot.paidCents,
        paidAt: nextStatus === InvoiceStatus.PAID ? invoice.paidAt ?? syncedAt : syncedAt,
        externalPaymentId,
        externalProvider: "quickbooks",
        notes: `Recorded from QuickBooks invoice ${qboInvoice.Id ?? invoice.externalInvoiceId}.`,
      };
      if (existing) {
        await tx.payment.update({ where: { id: existing.id }, data: paymentData });
      } else {
        await tx.payment.create({
          data: {
            firmId: invoice.firmId,
            claimId: invoice.claimId,
            invoiceId: invoice.id,
            payee: payeeName(claim.contact),
            ...paymentData,
          },
        });
      }
    }

    if (becamePaid || (recordedNewPayment && snapshot.paidCents > 0 && invoice.amountPaidCents === 0)) {
      await tx.activity.create({
        data: {
          firmId: invoice.firmId,
          claimId: invoice.claimId,
          contactId: claim.contactId,
          type: "EMAIL",
          subject: becamePaid ? "Invoice paid" : "Invoice payment updated",
          body: becamePaid
            ? `Invoice ${invoice.invoiceNumber} was marked paid by QuickBooks.`
            : `Invoice ${invoice.invoiceNumber} received a QuickBooks payment.`,
        },
      });
    }
  });

  return {
    invoiceId: qboInvoice.Id ?? invoice.externalInvoiceId ?? null,
    hostedInvoiceUrl: qboInvoice.InvoiceLink ?? invoice.externalHostedInvoiceUrl ?? null,
    pdfUrl: invoice.externalInvoicePdfUrl ?? null,
    status: snapshot.settlement,
    syncedAt,
  };
}

async function clientOrThrow(firm: Firm, config: IntuitConfig, fetcher?: IntuitFetcher, client?: QuickBooksClient) {
  return client ?? quickBooksClientForFirm(firm, config, fetcher);
}

export async function syncQuickBooksInvoice(firm: Firm, invoice: Invoice, options?: { fetcher?: IntuitFetcher; client?: QuickBooksClient; config?: IntuitConfig; paymentId?: string }) {
  if (!isQuickBooksEntityId(invoice.externalInvoiceId)) {
    return {
      invoiceId: invoice.externalInvoiceId ?? null,
      hostedInvoiceUrl: invoice.externalHostedInvoiceUrl ?? null,
      pdfUrl: invoice.externalInvoicePdfUrl ?? null,
      status: invoice.externalInvoiceStatus ?? null,
      syncedAt: invoice.externalSyncedAt ?? null,
    } satisfies ClientBillingInvoiceResult;
  }

  const config = options?.config ?? readIntuitConfig();
  if (!config) {
    throw new QuickBooksError("QuickBooks is not configured.", "not_configured");
  }

  const client = await clientOrThrow(firm, config, options?.fetcher, options?.client);
  const qboInvoice = await client.getInvoice(invoice.externalInvoiceId);
  return applyQuickBooksInvoice(firm, invoice, qboInvoice, options?.paymentId);
}

export async function syncOpenQuickBooksInvoices(firm: Firm, client: QuickBooksClient) {
  const invoices = await prisma.invoice.findMany({
    where: {
      firmId: firm.id,
      clientBillingProvider: "QUICKBOOKS",
      externalInvoiceId: { not: null },
      status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.WRITTEN_OFF] },
    },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  for (const invoice of invoices) {
    try {
      if (!isQuickBooksEntityId(invoice.externalInvoiceId)) {
        continue;
      }
      const qboInvoice = await client.getInvoice(invoice.externalInvoiceId);
      await applyQuickBooksInvoice(firm, invoice, qboInvoice);
    } catch (error) {
      console.error("[client-billing] QuickBooks invoice refresh failed.", invoice.id, error instanceof Error ? error.message : "unknown");
    }
  }
}

async function createQuickBooksInvoice(client: QuickBooksClient, firm: Firm, invoice: Invoice, claim: ClaimWithContact, customerId: string, itemId: string) {
  const number = docNumber(invoice.invoiceNumber);
  const claimLabel = claim.claimNumber?.trim() || claim.id;
  const body: Record<string, unknown> = {
    CustomerRef: { value: customerId },
    BillEmail: { Address: claim.contact.email?.trim() },
    TxnDate: isoDate(invoice.issuedAt) ?? isoDate(new Date()),
    DueDate: isoDate(invoice.dueAt),
    CustomerMemo: { value: `Public adjuster fee for claim ${claimLabel}`.slice(0, 1000) },
    PrivateNote: `PA ClaimBoard invoice ${invoice.id}`.slice(0, 4000),
    AllowOnlineCreditCardPayment: true,
    AllowOnlineACHPayment: true,
    Line: invoiceLines(firm, invoice, claim, itemId),
  };
  if (number) {
    body.DocNumber = number;
  }

  try {
    return await client.createInvoice(body);
  } catch (error) {
    if (!(error instanceof QuickBooksError) || error.code !== "6140" || !number) {
      throw error;
    }
    delete body.DocNumber;
    return client.createInvoice(body);
  }
}

export async function sendQuickBooksInvoice(args: { firm: Firm; invoice: Invoice; claim: ClaimWithContact; fetcher?: IntuitFetcher; client?: QuickBooksClient; config?: IntuitConfig }): Promise<ClientBillingInvoiceResult> {
  const email = args.claim.contact.email?.trim();
  if (!email) {
    throw new QuickBooksError("Add an email address on the client contact before sending a QuickBooks invoice.", "missing_email");
  }
  if (args.claim.firmId !== args.firm.id || args.invoice.firmId !== args.firm.id) {
    throw new QuickBooksError("Claim not found for invoice.", "missing_claim");
  }

  const config = args.config ?? readIntuitConfig();
  if (!config) {
    throw new QuickBooksError("QuickBooks is not configured.", "not_configured");
  }

  const client = await clientOrThrow(args.firm, config, args.fetcher, args.client);
  if (isQuickBooksEntityId(args.invoice.externalInvoiceId)) {
    const existing = await client.getInvoice(args.invoice.externalInvoiceId);
    if (quickBooksInvoiceSnapshot(existing).settlement === "paid") {
      return applyQuickBooksInvoice(args.firm, args.invoice, existing);
    }
    if (existing.EmailStatus !== "EmailSent") {
      await client.sendInvoice(existing.Id!, email);
    }
    const refreshed = await client.getInvoice(existing.Id!);
    return applyQuickBooksInvoice(args.firm, args.invoice, refreshed);
  }

  const customerId = await findOrCreateCustomer(client, args.claim.contact);
  const itemId = await ensureFeeItem(client, args.firm);
  const created = await createQuickBooksInvoice(client, args.firm, args.invoice, args.claim, customerId, itemId);
  await prisma.invoice.update({
    where: { id: args.invoice.id },
    data: {
      clientBillingProvider: "QUICKBOOKS",
      externalInvoiceId: created.Id,
      externalInvoiceStatus: "open",
    },
  });

  await client.sendInvoice(created.Id!, email);
  const refreshed = await client.getInvoice(created.Id!);
  if (quickBooksInvoiceSnapshot(refreshed).settlement !== "open") {
    const result = await applyQuickBooksInvoice(args.firm, args.invoice, refreshed);
    await prisma.invoice.update({
      where: { id: args.invoice.id },
      data: { sentToClientAt: args.invoice.sentToClientAt ?? result.syncedAt ?? new Date() },
    });
    await prisma.activity.create({
      data: {
        firmId: args.firm.id,
        claimId: args.claim.id,
        contactId: args.claim.contactId,
        type: "EMAIL",
        subject: "Invoice sent to client",
        body: `Sent invoice ${args.invoice.invoiceNumber} using QuickBooks.`,
      },
    });
    return result;
  }

  const syncedAt = new Date();
  await prisma.invoice.update({
    where: { id: args.invoice.id },
    data: {
      clientBillingProvider: "QUICKBOOKS",
      externalInvoiceId: refreshed.Id,
      externalInvoiceStatus: "open",
      externalHostedInvoiceUrl: refreshed.InvoiceLink ?? undefined,
      externalAmountDueCents: quickBooksInvoiceSnapshot(refreshed).balanceCents,
      externalAmountPaidCents: quickBooksInvoiceSnapshot(refreshed).paidCents,
      externalSyncedAt: syncedAt,
      sentToClientAt: args.invoice.sentToClientAt ?? syncedAt,
      status: args.invoice.status === InvoiceStatus.PAID ? InvoiceStatus.PAID : InvoiceStatus.SENT,
    },
  });

  await prisma.activity.create({
    data: {
      firmId: args.firm.id,
      claimId: args.claim.id,
      contactId: args.claim.contactId,
      type: "EMAIL",
      subject: "Invoice sent to client",
      body: `Sent invoice ${args.invoice.invoiceNumber} using QuickBooks.`,
    },
  });

  return {
    invoiceId: refreshed.Id ?? null,
    hostedInvoiceUrl: refreshed.InvoiceLink ?? null,
    pdfUrl: null,
    status: "open",
    syncedAt,
  };
}
