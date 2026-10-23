import { redirect } from "next/navigation";
import { SignupSuccessPanel } from "@/components/signup-success-panel";
import { parsePlanSlug } from "@/lib/billing";
import { decideSignupSuccessNavigation, signupSuccessCopy } from "@/lib/billing-display";
import { getCurrentSessionUser } from "@/lib/session";
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
  const signInAttemptFailed = firstValue(query.signin) === "failed";

  const navigation = decideSignupSuccessNavigation({
    sessionId,
    planSlug: queryPlan,
    signInAttemptFailed,
  });

  if (navigation.type === "enter") {
    redirect(navigation.href);
  }

  const currentUser = await getCurrentSessionUser();
  const facts = await readSignupCheckoutFacts(sessionId);
  const copy = signupSuccessCopy(
    {
      ...facts,
      planSlug: facts.planSlug ?? queryPlan,
    },
    {
      checkoutSessionId: sessionId,
      currentUser: currentUser ? { name: currentUser.name, email: currentUser.email } : null,
    },
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <SignupSuccessPanel copy={copy} />
      </div>
    </main>
  );
}
