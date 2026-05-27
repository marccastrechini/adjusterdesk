import Link from "next/link";
import { ActionForm, FieldError } from "@/components/action-form";
import { createActivityWithState, createTaskWithState, convertLeadToClaimWithState } from "@/lib/actions";
import { activityTypeOptions, taskPriorityOptions } from "@/lib/options";
import { formatDate, formatDateTime, fullName, labelFromEnum, propertyAddress } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { getLead } from "@/lib/queries";
import { taskTemplates } from "@/lib/templates";
import { Badge, ButtonLink, Card, DetailItem, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { lead, users } = await getLead(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/leads/${lead.id}`;

  return (
    <>
      <PageHeader
        title={fullName(lead.contact)}
        description={`${lead.lossType} lead from ${lead.source}. Follow-up ${formatDate(lead.followUpDate)}.`}
        actions={<ButtonLink href="/leads" variant="secondary">Back to leads</ButtonLink>}
      />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

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
              <ActionForm action={convertLeadToClaimWithState.bind(null, lead.id)} className="grid gap-3">
                <p className="text-sm leading-6 text-slate-600">Use this after the client is ready to open a claim. Carrier details can be filled in later if they are not known yet.</p>
                <Field label="Carrier" hint="Optional. Add the carrier name if the client has it."><input name="carrierName" className={inputClassName} /></Field>
                <Field label="Policy number" hint="Optional until the policy declarations are collected."><input name="policyNumber" className={inputClassName} /></Field>
                <Field label="Carrier claim number" hint="Optional until the carrier assigns one."><input name="claimNumber" className={inputClassName} /></Field>
                <Field label="Next step" hint="One clear action for the new claim, like request policy, schedule inspection, or call carrier."><textarea name="nextStep" className={textareaClassName} /></Field>
                <Field label="First follow-up task" hint="This becomes the first open task on the new claim.">
                  <input name="followUpTaskTitle" defaultValue={`Call ${lead.contact.firstName} and open the new claim file`} className={inputClassName} />
                </Field>
                <Field label="First follow-up date" hint="Use today or the next office day so the claim shows up on Today.">
                  <input name="followUpDueDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClassName} />
                </Field>
                <SubmitButton>Convert to claim and open overview</SubmitButton>
              </ActionForm>
            )}
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Add follow-up task</h2>
            <p className="text-sm leading-6 text-slate-600">Add the next call, text, appointment reminder, or document follow-up so it appears on Today when due.</p>
            <ActionForm action={createTaskWithState} className="grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Common task" hint="Optional office default for routine lead work.">
                <select name="taskTemplateKey" defaultValue="" className={selectClassName}>
                  <option value="">Custom task</option>
                  {taskTemplates.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
                </select>
              </Field>
              <Field label="Custom task" hint="Use this when the common task list does not fit."><input name="title" className={inputClassName} /><FieldError name="title" /></Field>
              <Field label="Due date" hint="Leave blank only if there is no date yet."><input name="dueDate" type="date" className={inputClassName} /></Field>
              <Field label="Assigned adjuster" hint="Choose who should see this follow-up.">
                <select name="assignedUserId" className={selectClassName} defaultValue={lead.assignedUserId ?? ""}>
                  <option value="">Unassigned</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </Field>
              <Field label="Priority" hint="Use High for work that should not wait.">
                <select name="priority" defaultValue="" className={selectClassName}>
                  <option value="">Use common task priority</option>
                  {taskPriorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <SubmitButton variant="secondary">Add follow-up task</SubmitButton>
            </ActionForm>
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Log lead activity</h2>
            <p className="text-sm leading-6 text-slate-600">Save calls, texts, emails, and quick office notes so the next person can see what happened.</p>
            <ActionForm action={createActivityWithState} className="grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="contactId" value={lead.contactId} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <Field label="Type" hint="Pick the closest contact type.">
                <select name="type" className={selectClassName} defaultValue="NOTE">
                  {activityTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Subject" required hint="Example: Left voicemail, photos received, appointment set."><input name="subject" required className={inputClassName} /><FieldError name="subject" /></Field>
              <Field label="Notes" hint="Add the details the office will need later."><textarea name="body" className={textareaClassName} /></Field>
              <SubmitButton variant="secondary">Log lead note</SubmitButton>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </>
  );
}
