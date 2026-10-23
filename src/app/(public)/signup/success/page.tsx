import { redirect } from "next/navigation";
import { SignupSuccessPanel } from "@/components/signup-success-panel";
import { parsePlanSlug } from "@/lib/billing";
import { signupSuccessCopy } from "@/lib/billing-display";
import { rethrowIfNavigationError } from "@/lib/navigation-errors";
import { withNotice } from "@/lib/notices";
import { createSessionForUser } from "@/lib/session";
import { completeStripeSignupFromSessionId } from "@/lib/signup";
import { readSignupCheckoutFacts } from "@/lib/signup-success";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupSuccessPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const sessionId = firstValue(query.session_id)?.trim() || undefined;
  const queryPlan = parsePlanSlug(firstValue(query.plan));

  if (sessionId) {
    try {
      const result = await completeStripeSignupFromSessionId(sessionId);
      const sessionCreated = await createSessionForUser(result.ownerUserId);
      if (sessionCreated) {
        redirect(withNotice(queryPlan ? `/start?signup_plan=${queryPlan}` : "/start", "self-service-signup-complete"));
      }
    } catch (error) {
      rethrowIfNavigationError(error);
    }
  }

  const facts = await readSignupCheckoutFacts(sessionId);
  const copy = signupSuccessCopy({
    ...facts,
    planSlug: facts.planSlug ?? queryPlan,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <SignupSuccessPanel copy={copy} />
      </div>
    </main>
  );
}
