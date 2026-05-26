import { createTemplate, deleteTemplate } from "@/lib/actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { templateTypeOptions } from "@/lib/options";
import { getTemplates } from "@/lib/queries";
import { documentCategoryGuides, documentRequestTemplates, taskTemplates } from "@/lib/templates";
import { Badge, Card, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

export default async function TemplatesPage() {
  const { templates } = await getTemplates();

  return (
    <>
      <PageHeader title="Templates" description="Common office defaults for follow-ups, document requests, categories, and reusable client-facing language." />

      <div className="grid gap-6">
        <Section title="Task templates" description="Common follow-ups used from lead and claim task forms.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {taskTemplates.map((template) => (
              <Card key={template.key} className="grid content-start gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-950">{template.title}</h3>
                  <Badge tone={template.priority === "HIGH" ? "red" : "slate"}>{labelFromEnum(template.priority)}</Badge>
                </div>
                <p className="text-sm leading-6 text-slate-600">{template.notes}</p>
              </Card>
            ))}
          </div>
        </Section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Section title="Document request templates" description="Common client requests used from claim document forms.">
            <div className="grid gap-3 md:grid-cols-2">
              {documentRequestTemplates.map((template) => (
                <Card key={template.key} className="grid content-start gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-950">{template.title}</h3>
                    <Badge>{labelFromEnum(template.category)}</Badge>
                  </div>
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
          <Section title="Saved message templates" description="Reusable email, text, letter, and checklist language for the office.">
            {templates.length === 0 ? (
              <EmptyState title="No saved messages" message="Add a follow-up or document request message for the office." />
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{template.name}</p>
                        {template.subject ? <p className="mt-1 text-sm text-slate-600">{template.subject}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{labelFromEnum(template.type)}</Badge>
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

          <Card className="grid gap-4 content-start">
            <h2 className="text-base font-semibold text-slate-950">Add message template</h2>
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
