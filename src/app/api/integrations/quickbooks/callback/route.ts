import { redirect } from "next/navigation";
import { getDemoContext } from "@/lib/app-context";
import { withNotice } from "@/lib/notices";
import { readIntuitConfig } from "@/lib/client-billing/quickbooks/config";
import { completeQuickBooksConnection } from "@/lib/client-billing/quickbooks/connection";

function isNextRedirectError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!readIntuitConfig()) {
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }

  if (url.searchParams.get("error")) {
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }

  try {
    const { firm } = await getDemoContext();
    await completeQuickBooksConnection({
      firm,
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      realmId: url.searchParams.get("realmId"),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("[client-billing] QuickBooks callback failed.", error instanceof Error ? error.message : "unknown");
    redirect(withNotice("/settings/client-payments", "quickbooks-connection-failed"));
  }

  redirect(withNotice("/settings/client-payments", "quickbooks-connected"));
}
