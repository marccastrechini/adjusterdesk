import { AnalyticsOnLoad } from "@/components/analytics-on-load";
import { Badge, ButtonLink, Card, Notice, PageHeader, Section, StatCard } from "@/components/ui";
import { activationProgress, buildActivationChecklist } from "@/lib/activation";
import { getNoticeMessage } from "@/lib/notices";
import { getActivationData } from "@/lib/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StartPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { firm, user, counts } = await getActivationData();
  const checklist = buildActivationChecklist(counts);
  const progress = activationProgress(checklist);
  const notice = getNoticeMessage(query);
  const noticeKey = firstValue(query.notice);
  const isSignupComplete = noticeKey === "self-service-signup-complete";

  return (
    <>
      {isSignupComplete ? (
        <>
          <AnalyticsOnLoad eventName="sign_up" dedupeKey="start:self-service-signup-complete:sign_up" eventData={{ source: "public-signup" }} />
          <AnalyticsOnLoad eventName="trial_created" dedupeKey="start:self-service-signup-complete:trial_created" eventData={{ source: "public-signup" }} />
          <AnalyticsOnLoad eventName="workspace_created" dedupeKey="start:self-service-signup-complete:workspace_created" eventData={{ source: "public-signup" }} />
        </>
      ) : null}

      <PageHeader
        title="Start here"
        description="A short setup path for a small public adjusting office moving from spreadsheets, email folders, texts, and paper checklists."
        actions={
          <>
            <ButtonLink href="/office-resources" variant="secondary">Open Office Playbook</ButtonLink>
            <ButtonLink href="/start/import" variant="secondary">Spreadsheet import</ButtonLink>
          </>
        }
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <Card className="grid gap-4 border-teal-200 bg-teal-50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-950">{firm.name}</p>
            <p className="mt-1 text-sm leading-6 text-teal-900">
              Signed in as {user.name}. Complete the checklist below to make the workspace useful for day-to-day claim work.
            </p>
          </div>
          <Badge tone={progress.completed === progress.total ? "green" : "teal"}>
            {progress.completed} of {progress.total} setup steps complete
          </Badge>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads" value={counts.leads} detail="Intake records in this workspace" />
        <StatCard label="Claims" value={counts.claims} detail="Claim files started" />
        <StatCard label="Open tasks" value={counts.openTasks} detail="Work still due or planned" />
        <StatCard label="Documents" value={counts.documents} detail="Uploads and client requests" />
      </div>

      <Section title="First-run checklist" description="Work through these steps to make the workspace useful for day-to-day claim work.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checklist.map((item, index) => (
            <Card key={item.title} className="grid content-start gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Step {index + 1}</p>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">{item.title}</h2>
                </div>
                <Badge tone={item.completed ? "green" : "amber"}>{item.completed ? "Done" : "Next"}</Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              <div>
                <ButtonLink href={item.href} variant={item.completed ? "secondary" : "primary"}>{item.action}</ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Coming from a spreadsheet">
          <Card className="grid content-start gap-3">
            <p className="text-sm leading-6 text-slate-600">
              Start with a simple leads or claims CSV. Review the rows first, then import the rows that are ready.
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/start/import" variant="secondary">Open spreadsheet import</ButtonLink>
              <ButtonLink href="/api/import-template/leads" variant="secondary">Lead template</ButtonLink>
              <ButtonLink href="/api/import-template/claims" variant="secondary">Claim template</ButtonLink>
              <ButtonLink href="/api/import-template/sample-office-leads" variant="secondary">Sample office list</ButtonLink>
            </div>
          </Card>
        </Section>

        <Section title="Office notes">
          <Card className="grid content-start gap-3">
            <p className="text-sm leading-6 text-slate-600">
              Capture anything confusing while it is fresh: missing fields, unclear wording, slow steps, or places where the office still reaches for a spreadsheet.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href="/feedback" variant="secondary">Send feedback</ButtonLink>
              <Badge tone="blue">{counts.feedback} saved</Badge>
            </div>
          </Card>
        </Section>
      </div>

      <Section title="Account setup">
        <Card className="grid gap-3">
          <p className="text-sm leading-6 text-slate-600">
            Review plan details and active-user limits before inviting additional users.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/settings/billing" variant="secondary">Review plan and billing</ButtonLink>
            <ButtonLink href="/settings/users" variant="secondary">Review users</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  );
}