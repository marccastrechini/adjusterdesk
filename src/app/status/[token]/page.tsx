import { ClientStatusView } from "@/components/client-status-view";
import { getStatusPage } from "@/lib/queries";

type PageProps = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: PageProps) {
  const { token } = await params;
  const statusLink = await getStatusPage(token);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <ClientStatusView firm={statusLink.firm} claim={statusLink.claim} statusLink={statusLink} className="mx-auto max-w-5xl" />
    </main>
  );
}
