import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createTaskWithState, toggleTask, updateClaimDeadlineWithState, updateTask } from "@/lib/actions";
import { formatDate, fullName, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { taskPriorityOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";
import { taskTemplates } from "@/lib/templates";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const taskStatusFilterOptions = [
  ["ALL", "All"],
  ["OPEN", "Open"],
  ["DONE", "Done"],
] as const;

const dueFilterOptions = [
  ["ALL", "All"],
  ["OVERDUE", "Overdue"],
  ["TODAY", "Due today"],
  ["UPCOMING", "Upcoming"],
  ["NO_DUE_DATE", "No due date"],
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dayStamp(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

export default async function ClaimTasksPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim, users } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/tasks`;
  const action = firstValue(query.action);
  const selectedAction = action === "add-task" || action === "deadline" ? action : undefined;
  const rawEditTask = firstValue(query.editTask);
  const editingTaskId = rawEditTask && claim.tasks.some((task) => task.id === rawEditTask) ? rawEditTask : undefined;
  const q = firstValue(query.q)?.trim() ?? "";
  const normalizedQuery = q.toLowerCase();
  const status = firstValue(query.status)?.trim() ?? "ALL";
  const priority = firstValue(query.priority)?.trim() ?? "ALL";
  const due = firstValue(query.due)?.trim() ?? "ALL";
  const hasFilters = Boolean(q) || status !== "ALL" || priority !== "ALL" || due !== "ALL";
  const today = new Date();
  const todayStamp = dayStamp(today);

  const filteredTasks = claim.tasks.filter((task) => {
    const searchValues = [task.title, task.notes ?? "", task.assignedUser?.name ?? ""];
    const matchesQuery = q.length === 0 || searchValues.some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesStatus = status === "ALL" || task.status === status;
    const matchesPriority = priority === "ALL" || task.priority === priority;

    const dueStamp = task.dueDate ? dayStamp(task.dueDate) : null;
    const matchesDue =
      due === "ALL" ||
      (due === "NO_DUE_DATE" && dueStamp === null) ||
      (due === "OVERDUE" && dueStamp !== null && dueStamp < todayStamp) ||
      (due === "TODAY" && dueStamp !== null && dueStamp === todayStamp) ||
      (due === "UPCOMING" && dueStamp !== null && dueStamp > todayStamp);

    return matchesQuery && matchesStatus && matchesPriority && matchesDue;
  });

  const openMatchingTasks = filteredTasks.filter((task) => task.status === "OPEN").length;
  const doneMatchingTasks = filteredTasks.filter((task) => task.status === "DONE").length;
  const overdueMatchingTasks = filteredTasks.filter((task) => task.dueDate && dayStamp(task.dueDate) < todayStamp).length;
  const noTasksYet = claim.tasks.length === 0;
  const noFilteredResults = !noTasksYet && filteredTasks.length === 0;
  const nextOpenTask = claim.tasks.find((task) => task.status === "OPEN");

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} tasks`} description="Create, edit, and complete claim follow-ups and deadlines." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-6">
          <Card>
            <form method="get" className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_auto] md:items-end">
              <Field label="Search tasks" hint="Search task title, notes, or assigned adjuster.">
                <input name="q" defaultValue={q} className={inputClassName} placeholder="Search tasks..." />
              </Field>
              <Field label="Status" hint="Show open or done tasks.">
                <select name="status" defaultValue={status} className={selectClassName}>
                  {taskStatusFilterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Priority" hint="Filter by urgency.">
                <select name="priority" defaultValue={priority} className={selectClassName}>
                  <option value="ALL">All</option>
                  {taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Due" hint="Filter by due date timing.">
                <select name="due" defaultValue={due} className={selectClassName}>
                  {dueFilterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <div className="flex items-center gap-3 pb-1">
                <SubmitButton variant="secondary">Apply filters</SubmitButton>
                {hasFilters ? <ButtonLink href={returnPath} variant="secondary">Clear filters</ButtonLink> : null}
              </div>
            </form>
          </Card>

          {noTasksYet ? (
            <EmptyState title="No tasks yet" message="Add a task for the next call, deadline, document request, or carrier follow-up." />
          ) : null}

          {noFilteredResults ? (
            <Card className="grid gap-3">
              <p className="font-medium text-slate-950">No tasks match these filters.</p>
              {hasFilters ? <div><ButtonLink href={returnPath} variant="secondary">Clear filters</ButtonLink></div> : null}
            </Card>
          ) : null}

          {!noTasksYet && !noFilteredResults ? (
            <>
              <Card className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Matching tasks</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredTasks.length} total</p>
                  <p className="mt-1 text-sm text-slate-600">Based on your current filters.</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Open</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{openMatchingTasks} open</p>
                  <p className="mt-1 text-sm text-slate-600">Tasks still in progress.</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Overdue</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{overdueMatchingTasks} overdue</p>
                  <p className="mt-1 text-sm text-slate-600">Tasks with due dates before today.</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Done</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{doneMatchingTasks} done</p>
                  <p className="mt-1 text-sm text-slate-600">Completed tasks in this result.</p>
                </div>
              </Card>

              <Section title="Claim tasks" description="Use tasks for the next office action, not long notes. Long details can go in the Notes field.">
                <div className="grid gap-4">
                  {filteredTasks.map((task) => (
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
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={toggleTask.bind(null, task.id, returnPath)}>
                            <SubmitButton variant="secondary">{task.status === "DONE" ? "Reopen" : "Complete"}</SubmitButton>
                          </form>
                          <ButtonLink href={`${returnPath}?editTask=${task.id}`} variant="secondary">Edit task</ButtonLink>
                        </div>
                      </div>

                      {editingTaskId === task.id ? (
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
                          <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
                            <SubmitButton variant="secondary">Save task</SubmitButton>
                            <ButtonLink href={returnPath} variant="secondary">Back to task list</ButtonLink>
                          </div>
                        </form>
                      ) : null}
                    </Card>
                  ))}
                </div>
              </Section>
            </>
          ) : null}
        </div>

        <aside className="grid gap-6 content-start">
          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Task actions</h2>

            {!selectedAction ? (
              <div className="grid gap-4">
                <div>
                  <ButtonLink href={`${returnPath}?action=add-task`} variant="primary">Add task</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Schedule the next office follow-up so it appears on Today.</p>
                </div>
                <div>
                  <ButtonLink href={`${returnPath}?action=deadline`} variant="secondary">Update claim deadline / next step</ButtonLink>
                  <p className="mt-1.5 text-xs text-slate-500">Keep the claim deadline and short next-step note current.</p>
                </div>
              </div>
            ) : null}

            {selectedAction === "add-task" ? (
              <ActionForm action={createTaskWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <p className="text-sm leading-6 text-slate-600">Start from a common task or write your own so the next office action stays clear.</p>
                <Field label="Start from a template" hint="Used when adding claim tasks. Or write your own task below.">
                  <select name="taskTemplateKey" defaultValue="" className={selectClassName}>
                    <option value="">Or write your own</option>
                    {taskTemplates.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
                  </select>
                </Field>
                <Field label="Or write your own" hint="Example: Call carrier for estimate status."><input name="title" className={inputClassName} /><FieldError name="title" /></Field>
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
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Add task to claim</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}

            {selectedAction === "deadline" ? (
              <ActionForm action={updateClaimDeadlineWithState.bind(null, claim.id)} className="grid gap-3">
                <p className="text-sm leading-6 text-slate-600">Keep the claim deadline and next step current so Today shows the right office work.</p>
                <Field label="Deadline date" hint="This appears in Today and on the claim overview.">
                  <input name="deadlineDate" type="date" defaultValue={claim.deadlineDate ? claim.deadlineDate.toISOString().slice(0, 10) : ""} className={inputClassName} />
                </Field>
                <Field label="Next step" hint="Short plain-language note for the next office action.">
                  <textarea name="nextStep" defaultValue={claim.nextStep ?? ""} className={textareaClassName} />
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Save deadline</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}

            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-950">Current deadline</p>
              <p className="mt-1">{formatDate(claim.deadlineDate)}</p>
              <p className="mt-3 font-medium text-slate-950">Next open task</p>
              <p className="mt-1">{nextOpenTask ? `${nextOpenTask.title} · ${formatDate(nextOpenTask.dueDate)}` : "No open task scheduled."}</p>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
