"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClientBillingProvider, InvoiceStatus } from "@/generated/prisma/client";
import { getDemoContext } from "@/lib/app-context";
import { withNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { logClientBillingStripeError } from "./stripe-connect-account";
import { quickbooksClientPaymentsEnabled } from "./quickbooks/config";
import { beginQuickBooksConnection, disconnectQuickBooks } from "./quickbooks/connection";
import { QuickBooksError } from "./quickbooks/errors";
import { clientBillingProviderSelection } from "./provider-choice";
import { createOrResumeStripeConnectClientBillingConnection, refreshClientBillingConnectionStatus, sendClientBillingInvoice, syncClientBillingInvoiceStatus, isClientBillingReady } from "./provider";

function isCheckboxEnabled(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function textOrUndefined(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : undefined;
}

function centsFromInput(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function isNextRedirectError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export async function startOrResumeClientBillingConnection() {
  const { firm } = await getDemoContext();
  let result: { url?: string | null } | null = null;

  try {
    result = await createOrResumeStripeConnectClientBillingConnection(firm);
  } catch (error) {
    logClientBillingStripeError("Stripe Connect onboarding failed.", error);
    result = null;
  }

  if (!result?.url) {
    redirect(withNotice("/settings/client-payments", "client-payment-request-unavailable"));
  }

  redirect(result.url);
}

export async function refreshClientBillingStatus() {
  const { firm } = await getDemoContext();
  try {
    await refreshClientBillingConnectionStatus(firm);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (firm.clientBillingProvider === ClientBillingProvider.QUICKBOOKS) {
      console.error("[client-billing] QuickBooks status refresh failed.", error instanceof Error ? error.message : "unknown");
      redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
    }

    throw error;
  }
  revalidatePath("/settings/client-payments");
  redirect(withNotice("/settings/client-payments", "client-billing-status-refreshed"));
}

export async function saveClientBillingProviderChoice(formData: FormData) {
  const { firm } = await getDemoContext();
  const choice = formData.get("provider")?.toString();
  if (choice !== "stripe" && choice !== "quickbooks") {
    redirect(withNotice("/settings/client-payments", "client-payment-request-unavailable"));
  }

  if (choice === "quickbooks" && !quickbooksClientPaymentsEnabled()) {
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }

  await prisma.firm.update({
    where: { id: firm.id },
    data: clientBillingProviderSelection(firm, choice),
  });

  revalidatePath("/settings/client-payments");
  revalidatePath("/money");
  redirect(withNotice("/settings/client-payments", "client-billing-provider-saved"));
}

export async function startQuickBooksConnection() {
  const { firm } = await getDemoContext();
  if (!quickbooksClientPaymentsEnabled()) {
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }

  try {
    const result = await beginQuickBooksConnection(firm);
    redirect(result.url);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("[client-billing] QuickBooks connect failed.", error instanceof Error ? error.message : "unknown");
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }
}

export async function disconnectQuickBooksConnection() {
  const { firm } = await getDemoContext();
  if (firm.clientBillingProvider !== ClientBillingProvider.QUICKBOOKS) {
    redirect(withNotice("/settings/client-payments", "client-payment-request-unavailable"));
  }

  try {
    await disconnectQuickBooks(firm);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("[client-billing] QuickBooks disconnect failed.", error instanceof Error ? error.message : "unknown");
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }

  revalidatePath("/settings/client-payments");
  redirect(withNotice("/settings/client-payments", "quickbooks-disconnected"));
}

export async function saveClientPaymentFeeSettings(formData: FormData) {
  const { firm } = await getDemoContext();
  const enabled = isCheckboxEnabled(formData.get("clientPaymentFeeEnabled"));
  const acknowledged = isCheckboxEnabled(formData.get("clientPaymentFeeAcknowledged"));
  const label = textOrUndefined(formData.get("clientPaymentFeeLabel"));
  const basisPoints = Number(formData.get("clientPaymentFeeBasisPoints") ?? 0);
  const fixedCents = centsFromInput(formData.get("clientPaymentFeeFixedCents"));

  if (enabled && !acknowledged) {
    redirect(withNotice("/settings/client-payments", "client-payment-fee-ack-required"));
  }

  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      clientPaymentFeeEnabled: enabled,
      clientPaymentFeeLabel: enabled ? label ?? "Client payment fee recovery" : null,
      clientPaymentFeeBasisPoints: enabled ? (Number.isFinite(basisPoints) ? Math.max(Math.round(basisPoints), 0) : null) : null,
      clientPaymentFeeFixedCents: enabled ? Math.max(fixedCents, 0) : null,
      clientPaymentFeeAcknowledgedAt: enabled ? new Date() : null,
    },
  });

  revalidatePath("/settings/client-payments");
  redirect(withNotice("/settings/client-payments", "client-billing-fee-updated"));
}

export async function sendClientPaymentRequest(formData: FormData) {
  const { firm } = await getDemoContext();
  const invoiceId = textOrUndefined(formData.get("invoiceId"));

  if (!invoiceId || !isClientBillingReady(firm) || (firm.clientBillingProvider !== ClientBillingProvider.STRIPE_CONNECT && firm.clientBillingProvider !== ClientBillingProvider.QUICKBOOKS)) {
    redirect(withNotice("/money", "client-payment-request-unavailable"));
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, firmId: firm.id },
    include: { claim: { include: { contact: true } } },
  });

  if (!invoice) {
    redirect(withNotice("/money", "client-payment-request-unavailable"));
  }

  if (invoice.externalHostedInvoiceUrl || invoice.sentToClientAt) {
    redirect(withNotice(`/claims/${invoice.claimId}/money`, "client-payment-request-already-sent"));
  }

  let result: Awaited<ReturnType<typeof sendClientBillingInvoice>>;

  try {
    result = await sendClientBillingInvoice(firm, invoice);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        externalInvoiceId: result.invoiceId ?? undefined,
        externalHostedInvoiceUrl: result.hostedInvoiceUrl ?? undefined,
        externalInvoicePdfUrl: result.pdfUrl ?? undefined,
        externalInvoiceStatus: result.status ?? undefined,
        externalSyncedAt: result.syncedAt ?? new Date(),
        sentToClientAt: new Date(),
        clientBillingProvider: firm.clientBillingProvider,
        status: result.status === "paid" ? InvoiceStatus.PAID : result.status === "partial" ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.SENT,
      },
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (firm.clientBillingProvider === ClientBillingProvider.QUICKBOOKS) {
      console.error("[client-billing] QuickBooks invoice send failed.", error instanceof Error ? error.message : "unknown");
      redirect(withNotice(`/claims/${invoice.claimId}/money`, error instanceof QuickBooksError && error.code === "missing_email" ? "client-payment-email-required" : "client-payment-request-unavailable"));
    }

    logClientBillingStripeError("Client payment request failed.", error);
    redirect(withNotice(`/claims/${invoice.claimId}/money`, "client-payment-request-unavailable"));
  }

  revalidatePath(`/claims/${invoice.claimId}/money`);
  revalidatePath("/money");
  redirect(withNotice(`/claims/${invoice.claimId}/money`, "client-payment-request-sent"));
}

export async function refreshClientInvoicePaymentStatus(formData: FormData) {
  const { firm } = await getDemoContext();
  const invoiceId = textOrUndefined(formData.get("invoiceId"));
  if (!invoiceId || firm.clientBillingProvider !== ClientBillingProvider.QUICKBOOKS) {
    redirect(withNotice("/money", "client-payment-request-unavailable"));
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, firmId: firm.id },
  });
  if (!invoice) {
    redirect(withNotice("/money", "client-payment-request-unavailable"));
  }

  const returnPath = `/claims/${invoice.claimId}/money`;
  try {
    await syncClientBillingInvoiceStatus(firm, invoice);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("[client-billing] QuickBooks invoice refresh failed.", error instanceof Error ? error.message : "unknown");
    redirect(withNotice(returnPath, "client-payment-request-unavailable"));
  }

  revalidatePath(returnPath);
  revalidatePath("/money");
  redirect(withNotice(returnPath, "client-billing-status-refreshed"));
}
