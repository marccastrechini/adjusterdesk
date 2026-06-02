import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { findPublicPlanBySlug } from "@/lib/billing";
import { createSessionForUser } from "@/lib/session";
import { completeStripeSignupFromSessionId } from "@/lib/signup";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupSuccessPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const sessionId = firstValue(query.session_id);
  const selectedPlan = findPublicPlanBySlug(firstValue(query.plan));

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Card className="grid gap-3">
            <h1 className="text-2xl font-semibold text-slate-950">Your workspace setup is received.</h1>
            {selectedPlan ? <p className="text-sm leading-6 text-slate-700">Selected plan: {selectedPlan.label}</p> : null}
            <p className="text-sm leading-6 text-slate-700">Billing has not started.</p>
            <p className="text-sm leading-6 text-slate-700">We will not bill you until after your first full calendar month of usage.</p>
            <p className="text-sm leading-6 text-slate-700">We will contact you before paid billing begins if any setup details are needed.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Back to signup</Link>
              <Link href="/demo" className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Talk to us</Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  try {
    const result = await completeStripeSignupFromSessionId(sessionId);
    const sessionCreated = await createSessionForUser(result.ownerUserId);

    if (!sessionCreated) {
      throw new Error("Session could not be created.");
    }

    redirect("/start?notice=self-service-signup-complete");
  } catch {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Card className="grid gap-3 border-amber-200 bg-amber-50">
            <h1 className="text-2xl font-semibold text-slate-950">Your workspace setup is received.</h1>
            {selectedPlan ? <p className="text-sm leading-6 text-slate-700">Selected plan: {selectedPlan.label}</p> : null}
            <p className="text-sm leading-6 text-slate-700">Billing has not started.</p>
            <p className="text-sm leading-6 text-slate-700">We will not bill you until after your first full calendar month of usage.</p>
            <p className="text-sm leading-6 text-slate-700">We will contact you before paid billing begins if any setup details are needed.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Back to signup</Link>
              <Link href="/demo" className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Contact support</Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }
}
