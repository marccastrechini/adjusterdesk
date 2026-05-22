import Link from "next/link";
import { createActivity, createTask, convertLeadToClaim } from "@/lib/actions";
import { activityTypeOptions, taskPriorityOptions } from "@/lib/options";
import { formatDate, formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getLead } from "@/lib/queries";
import { Badge, ButtonLink, Card, DetailItem, EmptyState, Field, inputClassName, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

type PageProps = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { lead, users } = await getLead(id);
  const returnPath = `/leads/${lead.id}`;

  return (
    <>
      <PageHeader
        title={fullName(lead.contact)}
        description={`${lead.lossType} lead from ${lead.source}. Follow-up ${formatDate(lead.followUpDate)}.`}
        actions={<ButtonLink href="/leads" variant="secondary">Back to leads</ButtonLink>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Lead details</h2>
                <p className="mt-1 text-sm text-slate-600">Created {formatDate(lead.createdAt)} · Assigned to {lead.assignedUser?.name ?? "Unassigned"}</p>
              </div>
              <Badge tone={lead.status === "CONVERTED" ? "green" : "teal"}>{labelFromEnum(lead.status)}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailItem label="Client" value={`${lead.contact.email ?? "No email"} · ${lead.contact.phone ?? "No phone"}`} />
              <DetailItem label="Property" value={propertyAddress(lead.property)} />
              <DetailItem label="Date of loss" value={formatDate(lead.dateOfLoss)} />
              <DetailItem label="Referral source" value={lead.referralSource ?? "Not set"} />
            </dl>
            {lead.notes ? <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{lead.notes}</p> : null}
          </Card>

          <Section title="Follow-up tasks">
            {lead.tasks.length === 0 ? (
              <EmptyState title="No lead tasks" message="Add a follow-up task so the lead stays warm." />
            ) : (
              <div className="grid gap-3">
                {lead.tasks.map((task) => (
                  <Card key={task.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-600">Due {formatDate(task.dueDate)} · {task.assignedUser?.name ?? "Unassigned"}</p>
                      </div>
                      <Badge tone={task.status === "DONE" ? "green" : "amber"}>{labelFromEnum(task.status)}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Lead notes and calls">
            {lead.activities.length === 0 ? (
              <EmptyState title="No activity yet" message="Log calls, texts, and notes as the lead develops." />
            ) : (
              <div className="grid gap-3">
                {lead.activities.map((activity) => (
                  <Card key={activity.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-950">{activity.subject}</p>
                        <p className="mt-1 text-sm text-slate-600">{labelFromEnum(activity.type)} · {formatDateTime(activity.occurredAt)} · {activity.user?.name ?? "Office"}</p>
                      </div>
                      <Badge>{labelFromEnum(activity.type)}</Badge>
                    </div>
                    {activity.body ? <p className="mt-3 text-sm leading-6 text-slate-700">{activity.body}</p> : null}
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="grid gap-6 content-start">
          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Convert to claim</h2>
            {lead.convertedClaim ? (
              <div>
                <p className="text-sm text-slate-600">This lead has already been converted.</p>
                <Link href={`/claims/${lead.convertedClaim.id}`} className="mt-3 inline-flex text-sm font-medium text-teal-800 hover:text-teal-900">Open claim</Link>
              </div>
            ) : (
              <form action={convertLeadToClaim.bind(null, lead.id)} className="grid gap-3">
                <Field label="Carrier"><input name="carrierName" className={inputClassName} /></Field>
                <Field label="Policy number"><input name="policyNumber" className={inputClassName} /></Field>
                <Field label="Carrier claim number"><input name="claimNumber" className={inputClassName} /></Field>
                <Field label="Next step"><textarea name="nextStep" className={textareaClassName} /></Field>
                <SubmitButton>Convert lead</SubmitButton>
              </form>
            )}
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Add follow-up task</h2>
            <form action={createTask} className="grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Task"><input name="title" required className={inputClassName} /></Field>
              <Field label="Due date"><input name="dueDate" type="date" className={inputClassName} /></Field>
              <Field label="Assigned adjuster">
                <select name="assignedUserId" className={selectClassName} defaultValue={lead.assignedUserId ?? ""}>
                  <option value="">Unassigned</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue="NORMAL" className={selectClassName}>
                  {taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <SubmitButton variant="secondary">Add task</SubmitButton>
            </form>
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Log lead activity</h2>
            <form action={createActivity} className="grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="contactId" value={lead.contactId} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Type">
                <select name="type" className={selectClassName} defaultValue="NOTE">
                  {activityTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Subject"><input name="subject" required className={inputClassName} /></Field>
              <Field label="Notes"><textarea name="body" className={textareaClassName} /></Field>
              <SubmitButton variant="secondary">Log activity</SubmitButton>
            </form>
          </Card>
        </aside>
      </div>
    </>
  );
}
