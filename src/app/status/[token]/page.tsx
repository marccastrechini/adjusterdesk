import { ClientStatusView } from "@/components/client-status-view";
import { Card, Notice } from "@/components/ui";
import { getStatusPage } from "@/lib/queries";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function StatusPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const query = await searchParams;
  const statusLink = await getStatusPage(token);
  const uploaded = Array.isArray(query.uploaded) ? query.uploaded[0] : query.uploaded;

  if (!statusLink.isActive) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <Card>
            <p className="text-sm font-medium text-teal-800">{statusLink.firm.name}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">Status link paused</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This status link is paused. Please contact the adjusting office for the latest update.
            </p>
            <dl className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
              {statusLink.firm.phone ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Phone</dt>
                  <dd className="mt-1">{statusLink.firm.phone}</dd>
                </div>
              ) : null}
              {statusLink.firm.email ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">Email</dt>
                  <dd className="mt-1">{statusLink.firm.email}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-4">
        {uploaded === "1" ? <Notice title="Document sent">Your file was sent to the office.</Notice> : null}
        <ClientStatusView firm={statusLink.firm} claim={statusLink.claim} statusLink={statusLink} statusToken={statusLink.token} allowClientUpload className="w-full" />
      </div>
    </main>
  );
}
