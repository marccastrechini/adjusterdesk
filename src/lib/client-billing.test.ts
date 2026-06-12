import assert from "node:assert/strict";
import { test } from "node:test";
import { createManualClientBillingProvider } from "@/lib/client-billing/manual-provider";
import { calculateClientPaymentFeeRecoveryCents } from "@/lib/client-billing/fee-recovery";
import { getClientBillingProviderName } from "@/lib/client-billing/provider";

test("client billing defaults to manual provider", () => {
  const providerName = getClientBillingProviderName({ clientBillingProvider: "MANUAL" } as never);
  assert.equal(providerName, "manual");
  assert.equal(createManualClientBillingProvider().isReady({} as never), false);
});

test("fee recovery defaults off until enabled and acknowledged", () => {
  const disabled = calculateClientPaymentFeeRecoveryCents(
    {
      clientPaymentFeeEnabled: false,
      clientPaymentFeeAcknowledgedAt: null,
      clientPaymentFeeBasisPoints: 300,
      clientPaymentFeeFixedCents: 250,
    } as never,
    10_000,
  );

  const missingAck = calculateClientPaymentFeeRecoveryCents(
    {
      clientPaymentFeeEnabled: true,
      clientPaymentFeeAcknowledgedAt: null,
      clientPaymentFeeBasisPoints: 300,
      clientPaymentFeeFixedCents: 250,
    } as never,
    10_000,
  );

  const enabled = calculateClientPaymentFeeRecoveryCents(
    {
      clientPaymentFeeEnabled: true,
      clientPaymentFeeAcknowledgedAt: new Date(),
      clientPaymentFeeBasisPoints: 300,
      clientPaymentFeeFixedCents: 250,
    } as never,
    10_000,
  );

  assert.equal(disabled, 0);
  assert.equal(missingAck, 0);
  assert.equal(enabled, 550);
});
