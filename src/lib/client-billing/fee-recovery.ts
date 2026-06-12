import type { Firm } from "@/generated/prisma/client";

export function calculateClientPaymentFeeRecoveryCents(firm: Pick<Firm, "clientPaymentFeeEnabled" | "clientPaymentFeeAcknowledgedAt" | "clientPaymentFeeBasisPoints" | "clientPaymentFeeFixedCents">, baseAmountCents: number) {
  if (!firm.clientPaymentFeeEnabled || !firm.clientPaymentFeeAcknowledgedAt) {
    return 0;
  }

  const basisPoints = firm.clientPaymentFeeBasisPoints ?? 0;
  const fixedCents = firm.clientPaymentFeeFixedCents ?? 0;
  const basisAmount = Math.round((baseAmountCents * basisPoints) / 10000);
  return Math.max(basisAmount + fixedCents, 0);
}
