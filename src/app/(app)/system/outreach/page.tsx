import Link from "next/link";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { outreachStatusLabel, outreachStatusOptions } from "@/lib/outreach";
import { getSortedSystemOutreachProspects, getSystemOutreachProspects, type SystemOutreachSort } from "@/lib/queries";
import { Badge, ButtonLink, Card, Notice, PageHeader, Section } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sortOptions: Array<{ value: SystemOutreachSort; label: string }> = [
  { value: "default", label: "Recommended queue" },
  { value: "firmName", label: "Firm name A-Z" },
  { value: "lastContactedDesc", label: "Last contacted, newest first" },
  { value: "lastContactedAsc", label: "Last contacted, oldest first" },
  { value: "updatedDesc", label: "Last updated, newest first" },
  { value: "createdDesc", label: "Created, newest first" },
  { value: "followUpDue", label: "Follow-up due first" },
];

function sortFromQuery(value: string | undefined): SystemOutreachSort {
  if (!value) return "default";
  return sortOptions.some((option) => option.value === value) ? (value as SystemOutreachSort) : "default";
}

function dateText(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
}

function previewText(replyObjection?: string | null, notes?: string | null) {
  const text = replyObjection || notes;
  if (!text) return "-";
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

export default async function SystemOutreachPage({ searchParams }: PageProps) {
  const sessionUser = await requireSystemOutreachContext();
  const outreachOperatorOnly = sessionUser.isOutreachOperator && !sessionUser.isSystemAdmin;
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const sort = sortFromQuery(firstValue(query.sort));
  const [{ statusCountMap, total }, sortedProspects] = await Promise.all([
    getSystemOutreachProspects(),
    getSortedSystemOutreachProspects(sort),
  ]);

  const errorMessage =
    error === "create-validation"
      ? "Prospect was not added. Check required fields and validation."
      : error === "update-validation"
        ? "Prospect was not updated. Check the entered values."
        : error === "missing"
          ? "That outreach prospect was not found."
          : undefined;

  return (
    <>
      <PageHeader
        title={outreachOperatorOnly ? "Outreach tracker" : "System outreach"}
        description={outreachOperatorOnly ? "Outreach operator workspace for first-contact prospect tracking." : "Internal queue for first-contact prospect tracking."}
        actions={
          <>
            {!outreachOperatorOnly ? <ButtonLink href="/system" variant="secondary">System dashboard</ButtonLink> : null}
            <ButtonLink href="/system/outreach/playbook" variant="secondary">Outreach playbook</ButtonLink>
            <ButtonLink href="/system/outreach/new">Add prospect</ButtonLink>
          </>
        }
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Outreach update not completed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Not contacted</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.NOT_CONTACTED}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Ready for outreach</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.READY_FOR_OUTREACH}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Email 1 sent</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.CONTACTED}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Follow-up due</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.FOLLOW_UP_DUE}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Replied - interested</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{statusCountMap.REPLIED_INTERESTED}</p>
        </Card>
      </div>

      {!outreachOperatorOnly ? (
        <Card className="text-xs leading-5 text-slate-600">
          <p><span className="font-semibold text-slate-800">Tracked prospects:</span> {total}</p>
        </Card>
      ) : null}

      <Section
        title="Outreach prospects"
        description="Scannable daily queue. Open a prospect to update status, follow-up, and notes."
        actions={
          <form method="get" className="flex items-center gap-2 text-sm">
            <label htmlFor="sort" className="text-slate-600">Sort</label>
            <select id="sort" name="sort" defaultValue={sort} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-950">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Apply</button>
          </form>
        }
      >
        <Card className="overflow-x-auto">
          <table className="min-w-[1400px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                <th scope="col" className="px-2 py-2 font-semibold">Firm</th>
                <th scope="col" className="px-2 py-2 font-semibold">Website</th>
                <th scope="col" className="px-2 py-2 font-semibold">State</th>
                <th scope="col" className="px-2 py-2 font-semibold">Contact</th>
                <th scope="col" className="px-2 py-2 font-semibold">Email</th>
                <th scope="col" className="px-2 py-2 font-semibold">Status</th>
                <th scope="col" className="px-2 py-2 font-semibold">Follow-up</th>
                <th scope="col" className="px-2 py-2 font-semibold">Date contacted</th>
                <th scope="col" className="px-2 py-2 font-semibold">Updated</th>
                <th scope="col" className="px-2 py-2 font-semibold">Created</th>
                <th scope="col" className="px-2 py-2 font-semibold">Reply / notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedProspects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-sm text-slate-600">No outreach prospects yet.</td>
                </tr>
              ) : (
                sortedProspects.map((prospect) => (
                  <tr key={prospect.id} className="border-b border-slate-100 align-top text-slate-700 last:border-b-0">
                    <td className="px-2 py-2">
                      <Link href={`/system/outreach/${prospect.id}`} className="font-semibold text-teal-800 hover:text-teal-900 hover:underline">
                        {prospect.firmName}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      {prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer" className="text-teal-800 hover:text-teal-900">{prospect.website}</a> : "-"}
                    </td>
                    <td className="px-2 py-2">{prospect.state ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.contactName ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.email ?? "-"}</td>
                    <td className="px-2 py-2"><Badge>{outreachStatusLabel(prospect.status)}</Badge></td>
                    <td className="px-2 py-2">{dateText(prospect.followUpDate)}</td>
                    <td className="px-2 py-2">{dateText(prospect.dateContacted)}</td>
                    <td className="px-2 py-2">{dateText(prospect.updatedAt)}</td>
                    <td className="px-2 py-2 text-xs text-slate-600">{dateText(prospect.createdAt)}</td>
                    <td className="px-2 py-2 max-w-[360px] text-xs text-slate-600">{previewText(prospect.replyObjection, prospect.notes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </Section>
    </>
  );
}
