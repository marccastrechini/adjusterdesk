import Link from "next/link";
import { requireSystemAdminContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { getSystemFeedbackEntries } from "@/lib/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Section } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

function pageHref(page: number) {
  return page <= 1 ? "/system/feedback" : `/system/feedback?page=${page}`;
}

function ratingTone(rating: number) {
  if (rating >= 4) return "green" as const;
  if (rating === 3) return "amber" as const;
  return "red" as const;
}

export default async function SystemFeedbackPage({ searchParams }: PageProps) {
  await requireSystemAdminContext();
  const params = await searchParams;
  const requestedPage = parsePage(firstValue(params.page));
  const { entries, total, page, pageSize, pageCount } = await getSystemFeedbackEntries(requestedPage);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : rangeStart + entries.length - 1;

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Feedback from every PA ClaimBoard workspace, newest first."
        actions={<ButtonLink href="/system" variant="secondary">System dashboard</ButtonLink>}
      />

      <Section
        title="All feedback"
        description={total === 0 ? "No notes yet." : `Showing ${rangeStart}–${rangeEnd} of ${total}.`}
        actions={
          pageCount > 1 ? (
            <>
              {page > 1 ? <ButtonLink href={pageHref(page - 1)} variant="secondary">Previous</ButtonLink> : null}
              {page < pageCount ? <ButtonLink href={pageHref(page + 1)} variant="secondary">Next</ButtonLink> : null}
            </>
          ) : null
        }
      >
        {entries.length === 0 ? (
          <EmptyState title="No feedback yet" message="Notes sent from office workspaces will show up here." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                  <th scope="col" className="px-2 py-2 font-semibold">Firm</th>
                  <th scope="col" className="px-2 py-2 font-semibold">User</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Page</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Rating</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Message</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr id={entry.id} key={entry.id} className="scroll-mt-20 border-b border-slate-100 align-top text-slate-700 last:border-b-0">
                    <td className="px-2 py-2">
                      <Link href={`/system/workspaces/${entry.firm.id}`} className="font-semibold text-teal-800 hover:text-teal-900 hover:underline">
                        {entry.firm.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-medium text-slate-950">{entry.user?.name ?? "Office user"}</p>
                      <p className="text-xs text-slate-500">{entry.user?.email ?? "No email"}</p>
                    </td>
                    <td className="px-2 py-2">{entry.page || "General feedback"}</td>
                    <td className="px-2 py-2">
                      {entry.rating ? <Badge tone={ratingTone(entry.rating)}>{entry.rating}/5</Badge> : <Badge>No rating</Badge>}
                    </td>
                    <td className="max-w-md px-2 py-2 whitespace-pre-line leading-6">{entry.message}</td>
                    <td className="px-2 py-2 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>
    </>
  );
}
