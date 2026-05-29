import { Badge, ButtonLink, Card, PageHeader, Section, StatCard } from "@/components/ui";
import { activationProgress, buildActivationChecklist } from "@/lib/activation";
import { getActivationData } from "@/lib/queries";

const demoResetCommand = "npm run demo:reset:local -- -ConfirmReset";

export default async function StartPage() {
  const { firm, user, counts } = await getActivationData();
  const checklist = buildActivationChecklist(counts);
  const progress = activationProgress(checklist);

  return (
    <>
      <PageHeader
        title="Start here"
        description="A short setup path for a small public adjusting office moving from spreadsheets, email folders, texts, and paper checklists."
        actions={
          <>
            <ButtonLink href="/office-resources" variant="secondary">Open resources</ButtonLink>
            <ButtonLink href="/start/import" variant="secondary">Spreadsheet import</ButtonLink>
          </>
        }
      />

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

      <Section title="First-run checklist" description="Work through these in order for the first pilot session, or use the demo reset command to practice with sample data.">
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

        <Section title="Demo reset">
          <Card className="grid content-start gap-3">
            <p className="text-sm leading-6 text-slate-600">
              Local demo data can be reset for a clean walkthrough. The reset script creates a backup first unless you explicitly skip it.
            </p>
            <code className="block rounded-md bg-slate-950 px-3 py-2 text-sm text-white">{demoResetCommand}</code>
            <p className="text-xs leading-5 text-slate-500">Use only for demo or training data, never real pilot office data.</p>
          </Card>
        </Section>

        <Section title="During a pilot">
          <Card className="grid content-start gap-3">
            <p className="text-sm leading-6 text-slate-600">
              Capture anything confusing while it is fresh: missing fields, unclear wording, slow steps, or places where the office still reaches for a spreadsheet.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href="/feedback" variant="secondary">Send pilot feedback</ButtonLink>
              <Badge tone="blue">{counts.feedback} saved</Badge>
            </div>
          </Card>
        </Section>
      </div>
    </>
  );
}