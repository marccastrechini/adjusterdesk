import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { requestConnectedAccountAchCapability } from "../src/lib/client-billing/stripe-connect-provider";
import { logClientBillingStripeError } from "../src/lib/client-billing/stripe-connect-account";

function readFlag(name: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    return undefined;
  }

  return value;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const firmId = readFlag("--firm-id");
  const firms = await prisma.firm.findMany({
    where: {
      stripeConnectAccountId: { not: null },
      ...(firmId ? { id: firmId } : {}),
    },
    orderBy: { name: "asc" },
  });

  if (firms.length === 0) {
    console.log(firmId ? `No connected account for firm ${firmId}.` : "No connected accounts to update.");
    return;
  }

  let failures = 0;

  for (const firm of firms) {
    try {
      const result = await requestConnectedAccountAchCapability(firm, undefined, { dryRun });
      console.log(
        `${dryRun ? "dry-run" : "updated"} ${firm.id} ${firm.name} account=${result.accountId} status=${result.status} requested=${result.requested}`,
      );
    } catch (error) {
      failures += 1;
      logClientBillingStripeError(`Could not request US bank account payments for firm ${firm.id}.`, error);
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} connected account${failures === 1 ? "" : "s"} could not be updated.`);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "ACH capability request failed.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
