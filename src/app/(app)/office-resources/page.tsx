import { Badge, ButtonLink, Card, PageHeader, Section } from "@/components/ui";
import { labelFromEnum } from "@/lib/format";
import { documentCategoryGuides, documentRequestTemplates, taskTemplates } from "@/lib/templates";

const officeResources = [
  {
    title: "New lead intake",
    items: ["Client name and best phone", "Damaged property address", "Loss type and date of loss", "Lead source", "Next follow-up date"],
    href: "/leads/new",
    action: "Add lead",
  },
  {
    title: "New claim file",
    items: ["Client and property", "Carrier and claim number if known", "Policy number if available", "Deadline date", "Short next step"],
    href: "/claims/new",
    action: "Add claim",
  },
  {
    title: "Client document request",
    items: ["Policy declarations", "Signed adjusting contract", "Damage photos", "Carrier letters", "Settlement or check details"],
    href: "/claims",
    action: "Open claims",
  },
  {
    title: "Daily close-out",
    items: ["Clear overdue tasks", "Set tomorrow's lead follow-ups", "Log carrier calls", "Request missing client documents", "Check unpaid invoices"],
    href: "/today",
    action: "Open Today",
  },
] as const;

export default function OfficeResourcesPage() {
  return (
    <>
      <PageHeader
        title="Resources"
        description="Plain office starters for intake, claim files, document requests, daily follow-up, and spreadsheet cleanup."
        actions={
          <>
            <ButtonLink href="/start" variant="secondary">Start checklist</ButtonLink>
            <ButtonLink href="/settings/templates" variant="secondary">Templates</ButtonLink>
          </>
        }
      />

      <Section title="Office starters" description="Use these as practical checklists for routine public adjusting office work. They do not replace professional judgment on a claim.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {officeResources.map((resource) => (
            <Card key={resource.title} className="grid content-start gap-4">
              <h2 className="text-base font-semibold text-slate-950">{resource.title}</h2>
              <ul className="grid gap-2 text-sm leading-6 text-slate-700">
                {resource.items.map((item) => (
                  <li key={item} className="flex gap-2"><Badge tone="teal">Item</Badge><span>{item}</span></li>
                ))}
              </ul>
              <div>
                <ButtonLink href={resource.href} variant="secondary">{resource.action}</ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Section title="Common task starters" description="These are the built-in task defaults available from lead and claim task forms.">
          <div className="grid gap-3 md:grid-cols-2">
            {taskTemplates.map((template) => (
              <Card key={template.key} className="grid content-start gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-950">{template.title}</h2>
                  <Badge tone={template.priority === "HIGH" ? "red" : "slate"}>{template.priority === "HIGH" ? "High" : "Normal"}</Badge>
                </div>
                <p className="text-sm leading-6 text-slate-600">{template.notes}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Document categories" description="Use the same categories each time so claim files stay easy to scan.">
          <div className="grid gap-3">
            {documentCategoryGuides.map((guide) => (
              <Card key={guide.category} className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-950">{guide.label}</h2>
                  <Badge>{labelFromEnum(guide.category)}</Badge>
                </div>
                <p className="text-sm leading-6 text-slate-600">{guide.examples}</p>
              </Card>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Document request starters" description="These are available when adding a claim document request.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {documentRequestTemplates.map((template) => (
            <Card key={template.key} className="grid content-start gap-2">
              <h2 className="font-semibold text-slate-950">{template.title}</h2>
              <Badge>{labelFromEnum(template.category)}</Badge>
              <p className="text-sm leading-6 text-slate-600">{template.notes}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Spreadsheet cleanup" description="Start with simple CSVs, then clean up missing details inside each lead or claim.">
        <Card className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <p className="text-sm leading-6 text-slate-600">
            Import leads or claims from a plain CSV, export filtered lists when the office needs a backup or review file, and avoid putting real client documents in Git.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/settings/import" variant="secondary">Open import</ButtonLink>
            <ButtonLink href="/leads" variant="secondary">Export leads</ButtonLink>
            <ButtonLink href="/claims" variant="secondary">Export claims</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  );
}