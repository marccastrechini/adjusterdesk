import Link from "next/link";
import { Card } from "@/components/ui";
import { markSignupIntentCanceled } from "@/lib/signup";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupCancelPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const intentId = firstValue(query.intent);

  if (intentId) {
    await markSignupIntentCanceled(intentId);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Card className="grid gap-3">
          <h1 className="text-2xl font-semibold text-slate-950">Signup was canceled</h1>
          <p className="text-sm leading-6 text-slate-700">
            No workspace was created. You can return to signup when you are ready.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Back to signup</Link>
            <Link href="/pricing" className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">View pricing</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
