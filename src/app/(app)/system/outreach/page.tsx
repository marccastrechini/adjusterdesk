import Link from "next/link";
import { OutreachTaskType } from "@/generated/prisma/client";
import { requireSystemOutreachContext } from "@/lib/app-context";
import { getNoticeMessage } from "@/lib/notices";
import { outreachStatusLabel } from "@/lib/outreach";
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

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function endOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

function taskTypeLabel(type: OutreachTaskType) {
  const map: Record<OutreachTaskType, string> = {
    RESEARCH: "Research",
    CALL_ATTEMPT_1: "Call attempt 1",
    SEND_EMAIL_1: "Send Email 1",
    CALL_ATTEMPT_2: "Call attempt 2",
    SEND_FOLLOW_UP: "Send follow-up",
    REVIEW_REPLY: "Review reply",
    SCHEDULE_FIT_CHECK: "Schedule fit check",
    RECYCLE_REVIEW: "Recycle review",
    MANUAL: "Manual task",
  };
  return map[type];
}

type OutreachQueueView = "today" | "overdue" | "upcoming" | "ready" | "waiting-follow-up" | "interested" | "all";

const queueViewOptions: Array<{ value: OutreachQueueView; label: string }> = [
  { value: "today", label: "Today + Overdue" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming (7 days)" },
  { value: "ready", label: "Ready for outreach" },
  { value: "waiting-follow-up", label: "Waiting for follow-up" },
  { value: "interested", label: "Interested" },
  { value: "all", label: "All prospects" },
];

function queueViewFromQuery(value: string | undefined): OutreachQueueView {
  if (!value) return "today";
  return queueViewOptions.some((option) => option.value === value) ? (value as OutreachQueueView) : "today";
}

export default async function SystemOutreachPage({ searchParams }: PageProps) {
  const sessionUser = await requireSystemOutreachContext();
  const outreachOperatorOnly = sessionUser.isOutreachOperator && !sessionUser.isSystemAdmin;
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const sort = sortFromQuery(firstValue(query.sort));
  const view = queueViewFromQuery(firstValue(query.view));
  const [{ statusCountMap, total }, sortedProspects] = await Promise.all([
    getSystemOutreachProspects(),
    getSortedSystemOutreachProspects(sort),
  ]);

  const todayStart = startOfUtcDay(new Date());
  const todayEnd = endOfUtcDay(new Date());
  const upcomingEnd = endOfUtcDay(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 7)));
  const visibleProspects = sortedProspects
    .filter((prospect) => {
      const nextTask = prospect.tasks[0];
      const due = nextTask?.dueDate ?? null;
      const isOverdue = Boolean(due && due < todayStart);
      const isDueToday = Boolean(due && due >= todayStart && due <= todayEnd);
      const isDueUpcoming = Boolean(due && due > todayEnd && due <= upcomingEnd);

      if (view === "overdue") {
        return isOverdue;
      }

      if (view === "upcoming") {
        return isDueUpcoming;
      }

      if (view === "ready") {
        return prospect.status === "READY_FOR_OUTREACH";
      }

      if (view === "waiting-follow-up") {
        return prospect.status === "FOLLOW_UP_DUE" || nextTask?.type === OutreachTaskType.SEND_FOLLOW_UP;
      }

      if (view === "interested") {
        return prospect.status === "REPLIED_INTERESTED" || prospect.status === "FIT_CHECK_SCHEDULED";
      }

      if (view === "today") {
        return isOverdue || isDueToday || prospect.status === "READY_FOR_OUTREACH" || nextTask?.type === OutreachTaskType.SEND_FOLLOW_UP;
      }

      return true;
    })
    .sort((a, b) => {
      if (view !== "today") {
        return 0;
      }

      const aTask = a.tasks[0];
      const bTask = b.tasks[0];
      const aDue = aTask?.dueDate ?? null;
      const bDue = bTask?.dueDate ?? null;
      const aOverdue = Boolean(aDue && aDue < todayStart);
      const bOverdue = Boolean(bDue && bDue < todayStart);
      const aDueToday = Boolean(aDue && aDue >= todayStart && aDue <= todayEnd);
      const bDueToday = Boolean(bDue && bDue >= todayStart && bDue <= todayEnd);

      const rank = (overdue: boolean, dueToday: boolean, ready: boolean, followUp: boolean) => {
        if (overdue) return 0;
        if (dueToday) return 1;
        if (ready) return 2;
        if (followUp) return 3;
        return 4;
      };

      const aRank = rank(aOverdue, aDueToday, a.status === "READY_FOR_OUTREACH", aTask?.type === OutreachTaskType.SEND_FOLLOW_UP);
      const bRank = rank(bOverdue, bDueToday, b.status === "READY_FOR_OUTREACH", bTask?.type === OutreachTaskType.SEND_FOLLOW_UP);
      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

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
            <ButtonLink href="/system/outreach/candidates" variant="secondary">Lead candidates</ButtonLink>
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
        title="Outreach work queue"
        description="Daily task-focused queue. Open a prospect to complete or update the next action."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="view" className="text-slate-600">View</label>
              <select id="view" name="view" defaultValue={view} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-950">
                {queueViewOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input type="hidden" name="sort" value={sort} />
              <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Apply</button>
            </form>
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="sort" className="text-slate-600">Sort</label>
              <select id="sort" name="sort" defaultValue={sort} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-950">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input type="hidden" name="view" value={view} />
              <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Sort</button>
            </form>
          </div>
        }
      >
        <Card className="overflow-x-auto">
          <table className="min-w-[1500px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                <th scope="col" className="px-2 py-2 font-semibold">Firm</th>
                <th scope="col" className="px-2 py-2 font-semibold">Status</th>
                <th scope="col" className="px-2 py-2 font-semibold">Next action</th>
                <th scope="col" className="px-2 py-2 font-semibold">Task due</th>
                <th scope="col" className="px-2 py-2 font-semibold">Contact</th>
                <th scope="col" className="px-2 py-2 font-semibold">Email</th>
                <th scope="col" className="px-2 py-2 font-semibold">Website</th>
                <th scope="col" className="px-2 py-2 font-semibold">State</th>
                <th scope="col" className="px-2 py-2 font-semibold">Date contacted</th>
                <th scope="col" className="px-2 py-2 font-semibold">Last activity</th>
                <th scope="col" className="px-2 py-2 font-semibold">Reply / notes</th>
              </tr>
            </thead>
            <tbody>
              {visibleProspects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-sm text-slate-600">No prospects match this view.</td>
                </tr>
              ) : (
                visibleProspects.map((prospect) => {
                  const nextTask = prospect.tasks[0];
                  const due = nextTask?.dueDate ?? null;
                  const isOverdue = Boolean(due && due < todayStart);
                  const isDueToday = Boolean(due && due >= todayStart && due <= todayEnd);
                  const rowClass = isOverdue
                    ? "border-b border-rose-100 bg-rose-50 align-top text-slate-700 last:border-b-0"
                    : isDueToday
                      ? "border-b border-amber-100 bg-amber-50 align-top text-slate-700 last:border-b-0"
                      : "border-b border-slate-100 align-top text-slate-700 last:border-b-0";
                  return (
                  <tr key={prospect.id} className={rowClass}>
                    <td className="px-2 py-2">
                      <Link href={`/system/outreach/${prospect.id}`} className="font-semibold text-teal-800 hover:text-teal-900 hover:underline">
                        {prospect.firmName}
                      </Link>
                    </td>
                    <td className="px-2 py-2"><Badge>{outreachStatusLabel(prospect.status)}</Badge></td>
                    <td className="px-2 py-2">{nextTask ? taskTypeLabel(nextTask.type) : "-"}</td>
                    <td className="px-2 py-2">
                      {isOverdue ? (
                        <span className="font-medium text-rose-700">{dateText(nextTask?.dueDate)} ▲ overdue</span>
                      ) : isDueToday ? (
                        <span className="font-medium text-amber-700">{dateText(nextTask?.dueDate)} · today</span>
                      ) : (
                        nextTask?.dueDate ? dateText(nextTask.dueDate) : "-"
                      )}
                    </td>
                    <td className="px-2 py-2">{prospect.contactName ?? "-"}</td>
                    <td className="px-2 py-2">{prospect.email ?? "-"}</td>
                    <td className="px-2 py-2">
                      {prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer" className="text-teal-800 hover:text-teal-900">{prospect.website}</a> : "-"}
                    </td>
                    <td className="px-2 py-2">{prospect.state ?? "-"}</td>
                    <td className="px-2 py-2">{dateText(prospect.dateContacted)}</td>
                    <td className="px-2 py-2">{dateText(prospect.updatedAt)}</td>
                    <td className="px-2 py-2 max-w-[360px] text-xs text-slate-600">{previewText(prospect.replyObjection, prospect.notes)}</td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </Card>
      </Section>
    </>
  );
}
