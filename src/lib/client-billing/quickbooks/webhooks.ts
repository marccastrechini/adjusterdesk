import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { IntuitConfig } from "./config";
import { isQuickBooksEntityId, quickBooksClientForFirm, type IntuitFetcher } from "./client";
import { QuickBooksError } from "./errors";
import { linkedInvoiceIds, syncQuickBooksInvoice } from "./invoices";
import { safeEqual } from "./tokens";

export type QuickBooksChange = {
  realmId: string;
  entity: "Invoice" | "Payment";
  id: string;
  operation: string;
};

export function verifyIntuitWebhookSignature(payload: string, signature: string | null, verifier: string) {
  if (!signature || !verifier) {
    return false;
  }

  const digest = createHmac("sha256", verifier).update(payload, "utf8").digest("base64");
  return safeEqual(digest, signature.trim());
}

function entityName(value: string): QuickBooksChange["entity"] | null {
  const normalized = value.toLowerCase();
  if (normalized === "invoice") {
    return "Invoice";
  }
  if (normalized === "payment") {
    return "Payment";
  }
  return null;
}

function parseCloudEvent(event: unknown): QuickBooksChange | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const record = event as Record<string, unknown>;
  const realmId = typeof record.intuitaccountid === "string" ? record.intuitaccountid : "";
  const id = typeof record.intuitentityid === "string" ? record.intuitentityid : "";
  const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
  const parts = type.split(".");
  const entity = parts[0] === "qbo" && parts[1] ? entityName(parts[1]) : null;
  const operation = parts[2] ?? "";
  if (!isQuickBooksEntityId(realmId) || !isQuickBooksEntityId(id) || !entity || !operation) {
    return null;
  }

  return { realmId, entity, id, operation };
}

function parseLegacy(payload: unknown): QuickBooksChange[] {
  if (!payload || typeof payload !== "object" || !("eventNotifications" in payload)) {
    return [];
  }

  const notifications = (payload as { eventNotifications?: unknown }).eventNotifications;
  if (!Array.isArray(notifications)) {
    return [];
  }

  const changes: QuickBooksChange[] = [];
  for (const notification of notifications) {
    if (!notification || typeof notification !== "object") {
      continue;
    }
    const realmId = typeof (notification as { realmId?: unknown }).realmId === "string" ? (notification as { realmId: string }).realmId : "";
    const entities = (notification as { dataChangeEvent?: { entities?: unknown } }).dataChangeEvent?.entities;
    if (!isQuickBooksEntityId(realmId) || !Array.isArray(entities)) {
      continue;
    }
    for (const entity of entities) {
      if (!entity || typeof entity !== "object") {
        continue;
      }
      const name = typeof (entity as { name?: unknown }).name === "string" ? (entity as { name: string }).name : "";
      const id = typeof (entity as { id?: unknown }).id === "string" ? (entity as { id: string }).id : "";
      const operation = typeof (entity as { operation?: unknown }).operation === "string" ? (entity as { operation: string }).operation : "Update";
      const parsedName = entityName(name);
      if (!parsedName || !isQuickBooksEntityId(id)) {
        continue;
      }
      changes.push({ realmId, entity: parsedName, id, operation });
    }
  }

  return changes;
}

export function parseQuickBooksChanges(payload: string): QuickBooksChange[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new QuickBooksError("QuickBooks webhook body was not valid JSON.", "invalid_json");
  }

  if (Array.isArray(parsed)) {
    return parsed.map(parseCloudEvent).filter((change): change is QuickBooksChange => change !== null);
  }

  return parseLegacy(parsed);
}

async function markInvoiceClosed(firmId: string, externalInvoiceId: string, operation: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { firmId, externalInvoiceId, clientBillingProvider: "QUICKBOOKS" },
  });
  if (!invoice) {
    return;
  }

  const voided = operation.toLowerCase().includes("void");
  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        externalInvoiceStatus: voided ? "voided" : "deleted",
        externalSyncedAt: new Date(),
        status: invoice.status === "WRITTEN_OFF" ? invoice.status : "SENT",
        amountPaidCents: 0,
        paidAt: null,
      },
    });
    await tx.payment.deleteMany({
      where: { firmId, invoiceId: invoice.id, externalProvider: "quickbooks" },
    });
  });
}

async function applyChangeForFirm(firmId: string, change: QuickBooksChange, config: IntuitConfig, fetcher?: IntuitFetcher) {
  const firm = await prisma.firm.findFirst({
    where: { id: firmId, quickbooksRealmId: change.realmId, clientBillingProvider: "QUICKBOOKS" },
  });
  if (!firm) {
    return;
  }

  if (change.entity === "Invoice" && ["delete", "void", "deleted", "voided"].includes(change.operation.toLowerCase())) {
    await markInvoiceClosed(firm.id, change.id, change.operation);
    return;
  }

  const client = await quickBooksClientForFirm(firm, config, fetcher);
  if (change.entity === "Payment") {
    const payment = await client.getPayment(change.id);
    for (const invoiceId of linkedInvoiceIds(payment.Line)) {
      const invoice = await prisma.invoice.findFirst({
        where: { firmId: firm.id, externalInvoiceId: invoiceId, clientBillingProvider: "QUICKBOOKS" },
      });
      if (!invoice) {
        continue;
      }
      await syncQuickBooksInvoice(firm, invoice, { client, config, fetcher, paymentId: payment.Id });
    }
    return;
  }

  const invoice = await prisma.invoice.findFirst({
    where: { firmId: firm.id, externalInvoiceId: change.id, clientBillingProvider: "QUICKBOOKS" },
  });
  if (!invoice) {
    return;
  }

  await syncQuickBooksInvoice(firm, invoice, { client, config, fetcher });
}

export async function processQuickBooksWebhookPayload(rawBody: string, options?: { config?: IntuitConfig; fetcher?: IntuitFetcher }) {
  const changes = parseQuickBooksChanges(rawBody);
  const config = options?.config;
  if (!config) {
    throw new QuickBooksError("QuickBooks is not configured.", "not_configured");
  }

  const failures: unknown[] = [];
  const seen = new Set<string>();
  for (const change of changes) {
    const firms = await prisma.firm.findMany({
      where: { quickbooksRealmId: change.realmId, clientBillingProvider: "QUICKBOOKS" },
      select: { id: true },
    });
    for (const firm of firms) {
      const key = `${firm.id}:${change.entity}:${change.id}:${change.operation}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      try {
        await applyChangeForFirm(firm.id, change, config, options?.fetcher);
      } catch (error) {
        console.error("[client-billing] QuickBooks webhook event failed.", change.entity, change.id, error instanceof Error ? error.message : "unknown");
        failures.push(error);
      }
    }
  }

  if (failures.length > 0) {
    throw failures[0];
  }
}

export async function handleQuickBooksWebhook(request: Request, config: IntuitConfig | null, options?: { fetcher?: IntuitFetcher }) {
  if (!config) {
    return NextResponse.json({ error: "QuickBooks is not configured." }, { status: 503 });
  }
  if (!config.webhookVerifier) {
    return NextResponse.json({ error: "QuickBooks webhook verifier is not configured." }, { status: 503 });
  }

  const payload = await request.text();
  if (!verifyIntuitWebhookSignature(payload, request.headers.get("intuit-signature"), config.webhookVerifier)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    await processQuickBooksWebhookPayload(payload, { config, fetcher: options?.fetcher });
  } catch (error) {
    if (error instanceof QuickBooksError && error.code === "invalid_json") {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }
    console.error("[client-billing] QuickBooks webhook failed.", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
