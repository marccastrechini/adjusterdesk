import { handleQuickBooksWebhook } from "@/lib/client-billing/quickbooks/webhooks";
import { readIntuitConfig } from "@/lib/client-billing/quickbooks/config";

export async function POST(request: Request) {
  return handleQuickBooksWebhook(request, readIntuitConfig());
}
