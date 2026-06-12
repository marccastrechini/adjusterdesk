import { labelFromEnum } from "@/lib/format";
import { planLabel, resolveIncludedUserLimit } from "@/lib/plans";
import { getDemoReadinessData } from "@/lib/queries";
import { getEnvStatus } from "@/lib/env";
import { Badge, ButtonLink, Card, PageHeader, Section, StatCard } from "@/components/ui";

const settingsCards = [
  {
    title: "Start checklist",
    description: "Guided first-run setup for leads, claims, tasks, documents, templates, and users.",
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
    title: "Billing",
    description: "Current plan, subscription status, user limits, and billing mode.",
    href: "/settings/billing",
    action: "Open billing",
  },
  {
    title: "Client Payments",
    description: "Connect Stripe for hosted client invoices and manage fee recovery settings.",
    href: "/settings/client-payments",
    action: "Open client payments",
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
    title: "Feedback",
    description: "Share notes on what's working and what needs improvement in the daily office workflow.",
    href: "/feedback",
    action: "Open feedback",
  },
] as const;

export default async function SettingsPage() {
  const { firm, user, users, counts } = await getDemoReadinessData();
  const envStatus = getEnvStatus({ authActive: true });
  const activeUsers = users.filter((entry) => entry.active);
  const inactiveUsers = users.filter((entry) => !entry.active);
  const roleLabels = Array.from(new Set(users.map((entry) => labelFromEnum(entry.role))));
  const includedUserLimit = resolveIncludedUserLimit(firm);

  return (
    <>
      <PageHeader title="Settings" description="Simple office defaults that reduce repeated setup work across leads and claims." />

      <Card className="grid gap-3 border-slate-200 bg-white">
        <h2 className="text-base font-semibold text-slate-950">What to do here</h2>
        <p className="text-sm leading-6 text-slate-600">
          Use Settings to keep your office setup steady: confirm who can sign in, keep templates current, and review office users before working with clients.
        </p>
        <p className="text-sm leading-6 text-slate-600">
          Current plan: {planLabel(firm.subscriptionPlan)} ({activeUsers.length} active of {includedUserLimit > 0 ? includedUserLimit : "custom"} included users)
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/settings/users" variant="secondary">Review office users</ButtonLink>
          <ButtonLink href="/settings/templates" variant="secondary">Review templates</ButtonLink>
          <ButtonLink href="/start" variant="secondary">Open start checklist</ButtonLink>
        </div>
      </Card>

      <Section title="Office overview">
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
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Leads" value={counts.leads} />
          <StatCard label="Claims" value={counts.claims} />
          <StatCard label="Documents" value={counts.documents} />
          <StatCard label="Invoices" value={counts.invoices} />
          <StatCard label="Users" value={users.length} detail={`${activeUsers.length} active`} />
          <StatCard label="Current role" value={labelFromEnum(user.role)} detail={user.name} />
        </div>
      </Section>

      <Section title="Environment status">
        <Card className="grid gap-4">
          <p className="text-sm leading-6 text-slate-600">
            These labels reflect the current runtime configuration for the signed-in office. Green-looking local checks are not a substitute for AUTH_SECRET, durable storage, or production backups.
          </p>
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-center gap-2">
              <dt className="text-sm text-slate-600">Workspace mode</dt>
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