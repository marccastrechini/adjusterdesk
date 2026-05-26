import { labelFromEnum } from "@/lib/format";
import { getDemoContext } from "@/lib/app-context";
import { getUsers } from "@/lib/queries";
import { Badge, ButtonLink, Card, PageHeader, Section } from "@/components/ui";

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
  const { firm, user } = await getDemoContext();
  const { users } = await getUsers();
  const roleLabels = Array.from(new Set(users.map((entry) => labelFromEnum(entry.role))));

  return (
    <>
      <PageHeader title="Settings" description="Simple office defaults that reduce repeated setup work across leads and claims." />

      <Section title="Pilot readiness">
        <Card className="grid gap-3 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Workspace is running in demo mode.</p>
          <div className="grid gap-1 text-sm leading-6 text-amber-900">
            <p>Current firm: {firm.name}</p>
            <p>Current demo user: {user.name} ({labelFromEnum(user.role)})</p>
            <p>Users in this workspace: {users.length} total ({users.filter((entry) => entry.active).length} active)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleLabels.map((role) => (
              <Badge key={role} tone="amber">{role}</Badge>
            ))}
          </div>
          <p className="text-sm leading-6 text-amber-900">
            This build does not have production sign-in, passwords, invitations, or firm switching yet.
          </p>
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