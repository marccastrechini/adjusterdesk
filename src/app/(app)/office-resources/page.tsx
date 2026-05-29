import { Badge, ButtonLink, Card, PageHeader, Section } from "@/components/ui";
import { labelFromEnum } from "@/lib/format";
import { documentCategoryGuides, documentRequestTemplates, taskTemplates } from "@/lib/templates";

const officeResources = [
  {
    title: "New lead intake",
    whenToUse: "Use this when a new prospect calls, texts, or is referred and needs to be entered before details get lost.",
    items: ["Client name and best phone", "Damaged property address", "Loss type and date of loss", "Lead source", "Next follow-up date"],
    href: "/leads/new",
    action: "Start lead intake",
  },
  {
    title: "New claim file",
    whenToUse: "Use this after intake when the client is ready to open an active claim file with the next office step.",
    items: ["Client and property", "Carrier and claim number if known", "Policy number if available", "Deadline date", "Short next step"],
    href: "/claims/new",
    action: "Open new claim",
  },
  {
    title: "Client document request",
    whenToUse: "Use this when the office needs missing policy, contract, photo, or carrier paperwork to move a claim forward.",
    items: ["Policy declarations", "Signed adjusting contract", "Damage photos", "Carrier letters", "Settlement or check details"],
    href: "/claims",
    action: "Open claim documents",
  },
  {
    title: "Daily close-out",
    whenToUse: "Use this at the end of each day to clear overdue items and set up tomorrow's work queue.",
    items: ["Clear overdue tasks", "Set tomorrow's lead follow-ups", "Log carrier calls", "Request missing client documents", "Check unpaid invoices"],
    href: "/today",
    action: "Open Today",
  },
] as const;

const defaultDueLabel = "Today (change in task form)";

export default function OfficeResourcesPage() {
  return (
    <>
      <PageHeader
        title="Office Playbook"
        description="Use this page to choose where to start and follow a practical workflow for daily claim operations."
      />

      <Card className="grid gap-2 border-teal-200 bg-teal-50">
        <p className="text-sm leading-6 text-teal-950">
          This is guidance, not a separate work area.
        </p>
        <p className="text-sm leading-6 text-teal-900">
          Real work is still tracked in Leads, Claims, Documents, Today, Money, and Activity.
        </p>
      </Card>

      <Section title="Starter workflows" description="Pick the workflow that matches what the office needs to do next.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {officeResources.map((resource) => (
            <Card key={resource.title} className="grid content-start gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{resource.title}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-normal text-slate-500">When to use this</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{resource.whenToUse}</p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">What to collect/check</p>
              <ul className="grid gap-2 text-sm leading-6 text-slate-700">
                {resource.items.map((item) => (
                  <li key={item} className="list-inside list-disc">{item}</li>
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
        <Section title="Common task starters" description="Reference only: these starter notes appear in lead and claim task forms when staff picks a task template.">
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-normal text-slate-600">
                    <th className="px-4 py-2 font-semibold">Template</th>
                    <th className="px-4 py-2 font-semibold">Starter note</th>
                    <th className="px-4 py-2 font-semibold">Priority</th>
                    <th className="px-4 py-2 font-semibold">Due default</th>
                  </tr>
                </thead>
                <tbody>
                  {taskTemplates.map((template) => (
                    <tr key={template.key} className="border-b border-slate-100 align-top last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-950">{template.title}</td>
                      <td className="px-4 py-3 text-slate-600">{template.notes}</td>
                      <td className="px-4 py-3">
                        <Badge tone={template.priority === "HIGH" ? "red" : "slate"}>{template.priority === "HIGH" ? "High" : "Normal"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{defaultDueLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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

      <Section title="Document request starters" description="Reference only: these starter options are available when adding a claim document request.">
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