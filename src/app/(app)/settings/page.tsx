import { ButtonLink, Card, PageHeader, Section } from "@/components/ui";

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

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Simple office defaults that reduce repeated setup work across leads and claims." />

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