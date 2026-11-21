import type { Firm } from "@/generated/prisma/client";

/**
 * Optional invoice line for processing-cost recovery. It is calculated from the
 * fee amount and added before the client chooses a payment method, so the same
 * total applies to card, debit, and ACH. It is not a card surcharge.
 */
export function calculateClientPaymentFeeRecoveryCents(firm: Pick<Firm, "clientPaymentFeeEnabled" | "clientPaymentFeeAcknowledgedAt" | "clientPaymentFeeBasisPoints" | "clientPaymentFeeFixedCents">, baseAmountCents: number) {
  if (!firm.clientPaymentFeeEnabled || !firm.clientPaymentFeeAcknowledgedAt) {
    return 0;
  }

  const basisPoints = firm.clientPaymentFeeBasisPoints ?? 0;
  const fixedCents = firm.clientPaymentFeeFixedCents ?? 0;
  const basisAmount = Math.round((baseAmountCents * basisPoints) / 10000);
  return Math.max(basisAmount + fixedCents, 0);
}
