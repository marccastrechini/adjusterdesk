import { ButtonLink, Card } from "@/components/ui";
import { clientPaymentsSetupPrompt, type ClientPaymentsFirm } from "@/lib/client-billing/ui";

export function ClientPaymentsSetupNote({ firm }: { firm: ClientPaymentsFirm }) {
  const prompt = clientPaymentsSetupPrompt(firm);
  if (!prompt) {
    return null;
  }

  return (
    <Card className="grid gap-2 border-amber-200 bg-amber-50">
      <p className="text-sm font-semibold text-slate-950">Online client payments</p>
      <p className="text-sm leading-6 text-slate-700">{prompt.message}</p>
      <div>
        <ButtonLink href={prompt.href} variant="secondary">
          {prompt.label}
        </ButtonLink>
      </div>
    </Card>
  );
}
