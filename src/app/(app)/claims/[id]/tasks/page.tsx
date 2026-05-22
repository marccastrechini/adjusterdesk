import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createTask, toggleTask, updateTask } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum } from "@/lib/format";
import { taskPriorityOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClaimTasksPage({ params }: PageProps) {
  const { id } = await params;
  const { claim, users } = await getClaim(id);
  const returnPath = `/claims/${claim.id}/tasks`;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} tasks`} description="Create, edit, and complete claim follow-ups and deadlines." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section title="Claim tasks">
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
                    <Field label="Task"><input name="title" required defaultValue={task.title} className={inputClassName} /></Field>
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
                      <Field label="Notes"><textarea name="notes" defaultValue={task.notes ?? ""} className={textareaClassName} /></Field>
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
          <form action={createTask} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Task"><input name="title" required className={inputClassName} /></Field>
            <Field label="Due date"><input name="dueDate" type="date" className={inputClassName} /></Field>
            <Field label="Assigned adjuster">
              <select name="assignedUserId" className={selectClassName} defaultValue={claim.assignedUserId ?? ""}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue="NORMAL" className={selectClassName}>
                {taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
            <SubmitButton>Add task</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
