import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createTaskWithState, toggleTask, updateTask } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { taskPriorityOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";
import { taskTemplates } from "@/lib/templates";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimTasksPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim, users } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/tasks`;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} tasks`} description="Create, edit, and complete claim follow-ups and deadlines." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section title="Claim tasks" description="Use tasks for the next office action, not long notes. Long details can go in the Notes field.">
          {claim.tasks.length === 0 ? (
            <EmptyState title="No tasks yet" message="Add a task for the next call, deadline, document request, or carrier follow-up." />
          ) : (
            <div className="grid gap-4">
              {claim.tasks.map((task) => (
                <Card key={task.id} className="grid gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{task.title}</p>
                        <Badge tone={task.status === "DONE" ? "green" : "amber"}>{labelFromEnum(task.status)}</Badge>
                        <Badge tone={task.priority === "HIGH" ? "red" : "slate"}>{labelFromEnum(task.priority)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">Due {formatDate(task.dueDate)} · {task.assignedUser?.name ?? "Unassigned"}</p>
                      {task.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{task.notes}</p> : null}
                    </div>
                    <form action={toggleTask.bind(null, task.id, returnPath)}>
                      <SubmitButton variant="secondary">{task.status === "DONE" ? "Reopen" : "Complete"}</SubmitButton>
                    </form>
                  </div>

                  <form action={updateTask.bind(null, task.id, returnPath)} className="grid gap-3 rounded-md bg-slate-50 p-3 lg:grid-cols-2">
                    <Field label="Task" required><input name="title" required defaultValue={task.title} className={inputClassName} /></Field>
                    <Field label="Due date"><input name="dueDate" type="date" defaultValue={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""} className={inputClassName} /></Field>
                    <Field label="Assigned adjuster">
                      <select name="assignedUserId" defaultValue={task.assignedUserId ?? ""} className={selectClassName}>
                        <option value="">Unassigned</option>
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select name="priority" defaultValue={task.priority} className={selectClassName}>
                        {taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <div className="lg:col-span-2">
                      <Field label="Notes" hint="Add details like who to call, what to ask for, or where the file is."><textarea name="notes" defaultValue={task.notes ?? ""} className={textareaClassName} /></Field>
                    </div>
                    <div className="lg:col-span-2">
                      <SubmitButton variant="secondary">Save task</SubmitButton>
                    </div>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Add task</h2>
          <p className="text-sm leading-6 text-slate-600">Add the next call, carrier follow-up, document request, inspection reminder, or deadline.</p>
          <ActionForm action={createTaskWithState} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Common task" hint="Optional office default for routine claim work.">
              <select name="taskTemplateKey" defaultValue="" className={selectClassName}>
                <option value="">Custom task</option>
                {taskTemplates.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
              </select>
            </Field>
            <Field label="Custom task" hint="Example: Call carrier for estimate status."><input name="title" className={inputClassName} /><FieldError name="title" /></Field>
            <Field label="Due date" hint="Tasks with dates appear on Today when due."><input name="dueDate" type="date" className={inputClassName} /></Field>
            <Field label="Assigned adjuster" hint="Choose the person responsible for this task.">
              <select name="assignedUserId" className={selectClassName} defaultValue={claim.assignedUserId ?? ""}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
            <Field label="Priority" hint="Use High for urgent client, carrier, or deadline work.">
              <select name="priority" defaultValue="" className={selectClassName}>
                <option value="">Use common task priority</option>
                {taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Notes" hint="Optional details for the person doing the work. Common tasks add a note when this is blank."><textarea name="notes" className={textareaClassName} /></Field>
            <SubmitButton>Add task to claim</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
