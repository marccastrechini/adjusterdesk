"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClientBillingProvider, InvoiceStatus } from "@/generated/prisma/client";
import { getDemoContext } from "@/lib/app-context";
import { withNotice } from "@/lib/notices";
import { prisma } from "@/lib/prisma";
import { createOrResumeStripeConnectClientBillingConnection, refreshClientBillingConnectionStatus, sendClientBillingInvoice, isClientBillingReady } from "./provider";

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

export async function startOrResumeClientBillingConnection() {
  const { firm } = await getDemoContext();
  let result: { url?: string | null } | null = null;

  try {
    result = await createOrResumeStripeConnectClientBillingConnection(firm);
  } catch {
    result = null;
  }

  if (!result?.url) {
    redirect(withNotice("/settings/client-payments", "client-payment-request-unavailable"));
  }

  redirect(result.url);
}

export async function refreshClientBillingStatus() {
  const { firm } = await getDemoContext();
  await refreshClientBillingConnectionStatus(firm);
  revalidatePath("/settings/client-payments");
  redirect(withNotice("/settings/client-payments", "client-billing-status-refreshed"));
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

  if (!invoiceId || firm.clientBillingProvider !== ClientBillingProvider.STRIPE_CONNECT || !isClientBillingReady(firm)) {
    redirect(withNotice("/money", "client-payment-request-unavailable"));
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, firmId: firm.id },
    include: { claim: { include: { contact: true } } },
  });

  if (!invoice) {
    redirect(withNotice("/money", "client-payment-request-unavailable"));
  }

  if (invoice.externalInvoiceId) {
    redirect(withNotice(`/claims/${invoice.claimId}/money`, "client-payment-request-already-sent"));
  }

  const result = await sendClientBillingInvoice(firm, invoice);
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      externalInvoiceId: result.invoiceId ?? undefined,
      externalHostedInvoiceUrl: result.hostedInvoiceUrl ?? undefined,
      externalInvoicePdfUrl: result.pdfUrl ?? undefined,
      externalInvoiceStatus: result.status ?? undefined,
      externalSyncedAt: result.syncedAt ?? new Date(),
      sentToClientAt: new Date(),
      clientBillingProvider: ClientBillingProvider.STRIPE_CONNECT,
      status: InvoiceStatus.SENT,
    },
  });

  revalidatePath(`/claims/${invoice.claimId}/money`);
  revalidatePath("/money");
  redirect(withNotice(`/claims/${invoice.claimId}/money`, "client-payment-request-sent"));
}
