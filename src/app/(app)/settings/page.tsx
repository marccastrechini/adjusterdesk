import { labelFromEnum } from "@/lib/format";
import { getPilotReadinessData } from "@/lib/queries";
import { Badge, ButtonLink, Card, PageHeader, Section, StatCard } from "@/components/ui";

const settingsCards = [
  {
    title: "Templates",
    description: "Follow-ups, document request defaults, document categories, and reusable office messages.",
    href: "/settings/templates",
    action: "Open templates",
  },
  {
    title: "Users",
    description: "Demo office users for assigning claims, tasks, documents, and communication notes.",
    href: "/settings/users",
    action: "Open users",
  },
  {
    title: "CSV import",
    description: "Bring a simple lead or claim spreadsheet into the local MVP.",
    href: "/settings/import",
    action: "Open import",
  },
] as const;

export default async function SettingsPage() {
  const { firm, user, users, counts } = await getPilotReadinessData();
  const activeUsers = users.filter((entry) => entry.active);
  const inactiveUsers = users.filter((entry) => !entry.active);
  const roleLabels = Array.from(new Set(users.map((entry) => labelFromEnum(entry.role))));

  const readyForPilotDemo = [
    "Lead intake",
    "Claim files",
    "Tasks and follow-ups",
    "Documents, uploads, and downloads",
    "Communications log",
    "Money tracking",
    "Reports",
    "CSV import and export",
    "Client status links and client uploads",
  ] as const;

  const demoOnlyGaps = [
    "Real auth and sign-in",
    "Firm and user session isolation",
    "External object storage",
    "Backups and deployment configuration",
    "Email and calendar integrations",
    "Permissions beyond demo scoping",
  ] as const;

  const recommendedBeforeRealFirms = [
    "Set up production deployment and repeatable backups",
    "Move uploads to managed object storage",
    "Add sign-in with firm-scoped sessions",
    "Define role-based permissions for office workflows",
    "Add operations runbooks for data restore and incident response",
  ] as const;

  return (
    <>
      <PageHeader title="Settings" description="Simple office defaults that reduce repeated setup work across leads and claims." />

      <Section title="Pilot readiness">
        <Card className="grid gap-3 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Workspace is running in demo mode.</p>
          <div className="grid gap-1 text-sm leading-6 text-amber-900">
            <p>Current firm: {firm.name}</p>
            <p>Current demo user: {user.name} ({labelFromEnum(user.role)})</p>
            <p>Users in this workspace: {users.length} total ({activeUsers.length} active, {inactiveUsers.length} inactive)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleLabels.map((role) => (
              <Badge key={role} tone="amber">{role}</Badge>
            ))}
          </div>
          <p className="text-sm leading-6 text-amber-900">
            This app is strong enough for internal pilot walkthroughs and daily workflow demos.
          </p>
          <p className="text-sm leading-6 text-amber-900">
            It is not ready for real customer data until sign-in, storage hardening, and production deployment/backup setup are completed.
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