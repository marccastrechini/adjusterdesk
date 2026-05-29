import { labelFromEnum } from "@/lib/format";
import { getPilotReadinessData } from "@/lib/queries";
import { getEnvStatus } from "@/lib/env";
import { Badge, ButtonLink, Card, PageHeader, Section, StatCard } from "@/components/ui";

const settingsCards = [
  {
    title: "Start checklist",
    description: "Guided first-run setup for leads, claims, tasks, documents, templates, users, and demo reset.",
    href: "/start",
    action: "Open start checklist",
  },
  {
    title: "Account security",
    description: "Change your own sign-in password for this office account.",
    href: "/settings/account",
    action: "Open account security",
  },
  {
    title: "Templates",
    description: "Follow-ups, document request defaults, document categories, and reusable office messages.",
    href: "/settings/templates",
    action: "Open templates",
  },
  {
    title: "Users",
    description: "Office users for sign-in, claim assignment, documents, and communication notes.",
    href: "/settings/users",
    action: "Open users",
  },
  {
    title: "CSV import",
    description: "Bring a simple lead or claim spreadsheet into the office workspace.",
    href: "/settings/import",
    action: "Open import",
  },
  {
    title: "Office Playbook",
    description: "Plain office starters for intake, claim files, document requests, daily follow-up, and CSV cleanup.",
    href: "/office-resources",
    action: "Open Office Playbook",
  },
  {
    title: "Pilot feedback",
    description: "Capture demo and pilot notes from the office while the workflow is fresh.",
    href: "/feedback",
    action: "Open feedback",
  },
] as const;

const demoResetCommand = "npm run demo:reset:local -- -ConfirmReset";

export default async function SettingsPage() {
  const { firm, user, users, counts } = await getPilotReadinessData();
  const envStatus = getEnvStatus({ authActive: true });
  const activeUsers = users.filter((entry) => entry.active);
  const inactiveUsers = users.filter((entry) => !entry.active);
  const roleLabels = Array.from(new Set(users.map((entry) => labelFromEnum(entry.role))));

  const readyForPilotDemo = [
    "Credentials sign-in and session auth",
    "Lead intake",
    "Claim files",
    "Tasks and follow-ups",
    "Documents, uploads, and downloads",
    "Communications log",
    "Money tracking",
    "Reports",
    "CSV import and export",
    "Guided start checklist",
    "User invites and password reset",
    "Client status links and client uploads",
    "Pilot feedback capture",
  ] as const;

  const demoOnlyGaps = [
    "OAuth or SSO sign-in",
    "Firm switching across offices",
    "External object storage",
    "Backups and deployment configuration",
    "Email and calendar integrations",
    "Permissions beyond basic office scoping",
  ] as const;

  const recommendedBeforeRealFirms = [
    "Set AUTH_SECRET on the deployment environment",
    "Set up production deployment and repeatable backups",
    "Move uploads to managed object storage",
    "Define role-based permissions for office workflows",
    "Add operations runbooks for data restore and incident response",
  ] as const;

  return (
    <>
      <PageHeader title="Settings" description="Simple office defaults that reduce repeated setup work across leads and claims." />

      <Card className="grid gap-3 border-slate-200 bg-white">
        <h2 className="text-base font-semibold text-slate-950">What to do here</h2>
        <p className="text-sm leading-6 text-slate-600">
          Use Settings to keep your office setup steady: confirm who can sign in, keep templates current, and review pilot readiness before sharing with real clients.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/settings/users" variant="secondary">Review office users</ButtonLink>
          <ButtonLink href="/settings/templates" variant="secondary">Review templates</ButtonLink>
          <ButtonLink href="/start" variant="secondary">Open start checklist</ButtonLink>
        </div>
      </Card>

      <Section title="Pilot readiness">
        <Card className="grid gap-3 border-teal-200 bg-teal-50">
          <p className="text-sm font-semibold text-teal-900">Office sign-in is active.</p>
          <div className="grid gap-1 text-sm leading-6 text-teal-900">
            <p>Current firm: {firm.name}</p>
            <p>Current user: {user.name} ({labelFromEnum(user.role)})</p>
            <p>Users in this office: {users.length} total ({activeUsers.length} active, {inactiveUsers.length} inactive)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleLabels.map((role) => (
              <Badge key={role} tone="teal">{role}</Badge>
            ))}
          </div>
          <p className="text-sm leading-6 text-teal-900">
            This app now uses first-party email and password sign-in with firm-scoped sessions.
          </p>
          <p className="text-sm leading-6 text-teal-900">
            Some advanced setup items are still outside this pilot pass, including external storage, email/calendar integrations, and production backup operations.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Leads" value={counts.leads} />
          <StatCard label="Claims" value={counts.claims} />
          <StatCard label="Documents" value={counts.documents} />
          <StatCard label="Invoices" value={counts.invoices} />
          <StatCard label="Users" value={users.length} detail={`${activeUsers.length} active`} />
          <StatCard label="Current role" value={labelFromEnum(user.role)} detail={user.name} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <h3 className="text-base font-semibold text-slate-950">Ready for pilot demo</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              {readyForPilotDemo.map((item) => (
                <li key={item} className="flex items-start gap-2"><Badge tone="green">Ready</Badge><span>{item}</span></li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-slate-950">Demo-only and needs production work</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              {demoOnlyGaps.map((item) => (
                <li key={item} className="flex items-start gap-2"><Badge tone="amber">Gap</Badge><span>{item}</span></li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-slate-950">Recommended before real firms</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              {recommendedBeforeRealFirms.map((item) => (
                <li key={item} className="flex items-start gap-2"><Badge tone="blue">Next</Badge><span>{item}</span></li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="grid gap-3 border-sky-200 bg-sky-50">
          <h3 className="text-base font-semibold text-slate-950">Before real deployment</h3>
          <p className="text-sm leading-6 text-slate-700">Top checklist items for pilot deployment readiness:</p>
          <ul className="grid gap-2 text-sm leading-6 text-slate-700">
            <li className="flex items-start gap-2"><Badge tone="blue">1</Badge><span>Set AUTH_SECRET and verify office sign-in in deployment</span></li>
            <li className="flex items-start gap-2"><Badge tone="blue">2</Badge><span>Production database and backup/restore plan</span></li>
            <li className="flex items-start gap-2"><Badge tone="blue">3</Badge><span>External file storage instead of local disk uploads</span></li>
            <li className="flex items-start gap-2"><Badge tone="blue">4</Badge><span>Decide how user invites, account recovery, and inactive accounts will be handled</span></li>
            <li className="flex items-start gap-2"><Badge tone="blue">5</Badge><span>Run build and smoke tests before release</span></li>
          </ul>
          <p className="text-xs leading-5 text-slate-600">See docs/pilot-deployment-checklist.md for the full practical deployment checklist.</p>
        </Card>
      </Section>

      <Section title="Demo data and reset" description="Use this only for demo or training workspaces, not real pilot office data.">
        <Card className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-slate-950">Local demo reset is available.</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              The reset script backs up the local profile, reseeds sample leads, claims, documents, money records, templates, users, and clears pilot feedback.
            </p>
            <code className="mt-3 block rounded-md bg-slate-950 px-3 py-2 text-sm text-white">{demoResetCommand}</code>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <ButtonLink href="/start" variant="secondary">Open start checklist</ButtonLink>
            <ButtonLink href="/settings/import" variant="secondary">Open CSV import</ButtonLink>
          </div>
        </Card>
      </Section>

      <Section title="Environment status">
        <Card className="grid gap-4">
          <p className="text-sm leading-6 text-slate-600">
            These labels reflect the current runtime configuration for the signed-in office. Green-looking local checks are not a substitute for AUTH_SECRET, durable storage, or production backups.
          </p>
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Demo workspace mode</dt>
              <dd><Badge tone={envStatus.demoWorkspaceMode === "Off" ? "green" : "amber"}>{envStatus.demoWorkspaceMode}</Badge></dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Local file storage</dt>
              <dd><Badge tone="amber">{envStatus.localFileStorage}</Badge></dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Real auth</dt>
              <dd><Badge tone={envStatus.realAuth === "Active" ? "green" : envStatus.realAuth === "Configured" ? "blue" : "red"}>{envStatus.realAuth}</Badge></dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Production database</dt>
              <dd><Badge tone={envStatus.productionDatabase === "External database" ? "green" : "amber"}>{envStatus.productionDatabase}</Badge></dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Public status links</dt>
              <dd><Badge tone="blue">{envStatus.publicStatusLinks}</Badge></dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Node environment</dt>
              <dd><Badge tone="blue">{envStatus.nodeEnv}</Badge></dd>
            </div>
          </dl>
        </Card>
      </Section>

      <Section title="Office setup">
        <div className="grid gap-4 md:grid-cols-3">
          {settingsCards.map((card) => (
            <Card key={card.href} className="grid content-start gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              </div>
              <div>
                <ButtonLink href={card.href} variant="secondary">{card.action}</ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}