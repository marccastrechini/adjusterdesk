import { createTemplate, deleteTemplate } from "@/lib/actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { TemplateType } from "@/generated/prisma/client";
import { templateTypeOptions } from "@/lib/options";
import { getTemplates } from "@/lib/queries";
import { documentCategoryGuides, documentRequestTemplates, messageTemplateTypes, taskTemplates, templateUsageSummaries } from "@/lib/templates";
import { Badge, Card, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

const messageTemplateTypeLabels = new Map<TemplateType, string>([
  [TemplateType.EMAIL, "Email"],
  [TemplateType.TEXT, "Text"],
  [TemplateType.LETTER, "Letter"],
]);

export default async function TemplatesPage() {
  const { templates } = await getTemplates();
  const messageTemplates = templates.filter((template) => messageTemplateTypes.includes(template.type));
  const checklistTemplates = templates.filter((template) => template.type === TemplateType.CHECKLIST);

  return (
    <>
      <PageHeader title="Templates" description="Save common follow-ups, document requests, and message starters so staff do not rewrite the same notes each day." />

      <div className="grid gap-6">
        <Section title="Where templates are used" description="Use this quick map to see what is already active in daily workflows and what is still setup-only.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {templateUsageSummaries.map((item) => (
              <Card key={item.title} className="grid content-start gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <Badge tone={item.status === "Active" ? "green" : item.status === "Partially used" ? "amber" : "slate"}>{item.status}</Badge>
                </div>
                <p className="text-sm leading-6 text-slate-600">{item.usedIn}</p>
                <p className="text-xs leading-5 text-slate-500">{item.example}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Task templates" description="Common follow-ups your office can add quickly from lead and claim task forms.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {taskTemplates.map((template) => (
              <Card key={template.key} className="grid content-start gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-950">{template.title}</h3>
                  <Badge tone={template.priority === "HIGH" ? "red" : "slate"}>{labelFromEnum(template.priority)}</Badge>
                </div>
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Used when adding lead and claim tasks.</p>
                <p className="text-sm leading-6 text-slate-600">{template.notes}</p>
              </Card>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Section title="Document request templates" description="Common client document requests used from claim document forms.">
            <div className="grid gap-3 md:grid-cols-2">
              {documentRequestTemplates.map((template) => (
                <Card key={template.key} className="grid content-start gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-950">{template.title}</h3>
                    <Badge>{labelFromEnum(template.category)}</Badge>
                  </div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Used when requesting claim documents.</p>
                  <p className="text-sm leading-6 text-slate-600">{template.notes}</p>
                </Card>
              ))}
            </div>
          </Section>

          <Section title="Document categories" description="The standard categories used to keep claim documents scannable.">
            <div className="grid gap-3">
              {documentCategoryGuides.map((guide) => (
                <Card key={guide.category}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-950">{guide.label}</h3>
                    <Badge>{labelFromEnum(guide.category)}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{guide.examples}</p>
                </Card>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-6">
            <Section title="Claim communication templates" description="Email, text, and letter templates can start a claim communication note. Use the same plain-language wording here and on the claim communications page.">
              {messageTemplates.length === 0 ? (
                <EmptyState title="No saved message templates" message="Add a short office message starter for claim communications." />
              ) : (
                <div className="grid gap-3">
                  {messageTemplates.map((template) => (
                    <Card key={template.id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{template.name}</p>
                          {template.subject ? <p className="mt-1 text-sm text-slate-600">{template.subject}</p> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{messageTemplateTypeLabels.get(template.type) ?? labelFromEnum(template.type)}</Badge>
                          <Badge tone="green">Used in claim communications</Badge>
                          <form action={deleteTemplate.bind(null, template.id)}>
                            <SubmitButton variant="secondary">Delete</SubmitButton>
                          </form>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{template.body}</p>
                      <p className="mt-3 text-xs text-slate-500">Updated {formatDate(template.updatedAt)}</p>
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Checklist templates" description="Checklists stay in Settings for now. Use them for office prep while claim-level checklist workflow is still pending.">
              {checklistTemplates.length === 0 ? (
                <EmptyState title="No checklist templates" message="Add one if your office wants a simple prep checklist." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {checklistTemplates.map((template) => (
                    <Card key={template.id} className="grid content-start gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">{template.name}</p>
                          <p className="mt-1 text-sm text-slate-600">Checklist template</p>
                        </div>
                        <Badge tone="slate">Planned</Badge>
                      </div>
                      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Settings only for now.</p>
                      <p className="text-sm leading-6 whitespace-pre-line text-slate-700">{template.body}</p>
                      <p className="text-xs text-slate-500">Updated {formatDate(template.updatedAt)}</p>
                      <form action={deleteTemplate.bind(null, template.id)}>
                        <SubmitButton variant="secondary">Delete</SubmitButton>
                      </form>
                    </Card>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <Card className="grid gap-4 content-start">
            <h2 className="text-base font-semibold text-slate-950">Add template</h2>
            <p className="text-sm leading-6 text-slate-600">Email, text, and letter templates can start claim communication notes. Checklist templates remain Settings-only for this pilot pass.</p>
            <form action={createTemplate} className="grid gap-3">
              <Field label="Name"><input name="name" required className={inputClassName} /></Field>
              <Field label="Type">
                <select name="type" defaultValue="EMAIL" className={selectClassName}>
                  {templateTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Subject"><input name="subject" className={inputClassName} /></Field>
              <Field label="Body"><textarea name="body" required className={textareaClassName} /></Field>
              <SubmitButton>Add template</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
