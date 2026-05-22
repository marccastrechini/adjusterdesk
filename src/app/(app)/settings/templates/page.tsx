import { createTemplate } from "@/lib/actions";
import { formatDate, labelFromEnum } from "@/lib/format";
import { templateTypeOptions } from "@/lib/options";
import { getTemplates } from "@/lib/queries";
import { Badge, Card, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

export default async function TemplatesPage() {
  const { templates } = await getTemplates();

  return (
    <>
      <PageHeader title="Templates" description="Reusable email, text, letter, and checklist language for common claim office work." />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section title="Saved templates">
          {templates.length === 0 ? (
            <EmptyState title="No templates" message="Add a follow-up or document request template for the office." />
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{template.name}</p>
                      {template.subject ? <p className="mt-1 text-sm text-slate-600">{template.subject}</p> : null}
                    </div>
                    <Badge>{labelFromEnum(template.type)}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{template.body}</p>
                  <p className="mt-3 text-xs text-slate-500">Updated {formatDate(template.updatedAt)}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add template</h2>
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
    </>
  );
}
