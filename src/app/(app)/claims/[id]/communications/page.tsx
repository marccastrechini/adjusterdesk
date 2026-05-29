import { ClaimTabs } from "@/components/claim-tabs";
import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createActivityWithState } from "@/lib/actions";
import { buildClaimActivityTimeline, filterTimelineItems, normalizeTimelineFilter } from "@/lib/activity-log";
import { formatDateTime, fullName, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { activityTypeOptions } from "@/lib/options";
import { getClaim, getTemplates } from "@/lib/queries";
import { messageTemplateTypes } from "@/lib/templates";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const communicationTypeFilterOptions = [
  ["ALL", "All"],
  ["NOTES", "Notes"],
  ["DOCUMENTS", "Documents"],
  ["TASKS", "Tasks"],
  ["MONEY", "Money"],
  ["CLIENT_UPDATES", "Client updates"],
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClaimCommunicationsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim } = await getClaim(id);
  const { templates } = await getTemplates();
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/communications`;
  const action = firstValue(query.action);
  const selectedAction = action === "log-communication" ? action : undefined;
  const quickType = firstValue(query.quickType) ?? "NOTE";
  const q = firstValue(query.q)?.trim() ?? "";
  const normalizedQuery = q.toLowerCase();
  const timelineFilter = normalizeTimelineFilter(firstValue(query.type));
  const hasFilters = Boolean(q) || timelineFilter !== "ALL";
  const messageTemplates = templates.filter((template) => messageTemplateTypes.includes(template.type));
  const timelineItems = buildClaimActivityTimeline(claim.activities);

  const filteredActivities = filterTimelineItems(timelineItems, timelineFilter).filter((activity) => {
    const searchableValues = [activity.subject, activity.body ?? "", activity.userName, activity.contactName ?? "", activity.typeLabel];
    const matchesQuery = q.length === 0 || searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery;
  });

  const latestMatchingUpdate = filteredActivities[0]?.occurredAt;
  const callCount = timelineItems.filter((activity) => activity.type === "CALL").length;
  const emailCount = timelineItems.filter((activity) => activity.type === "EMAIL").length;
  const textCount = timelineItems.filter((activity) => activity.type === "TEXT").length;
  const noCommunicationsYet = claim.activities.length === 0;
  const noFilteredResults = !noCommunicationsYet && filteredActivities.length === 0;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} notes and activity`} description="Open the claim history in one place: notes, calls, document updates, tasks, money updates, and client status link activity." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-6">
          <Card>
            <form method="get" className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_auto] md:items-end">
              <Field label="Search activity" hint="Search subject, details, team member, or contact name.">
                <input name="q" defaultValue={q} className={inputClassName} placeholder="Search timeline..." />
              </Field>
              <Field label="Show" hint="Quick filter for the timeline.">
                <select name="type" defaultValue={timelineFilter} className={selectClassName}>
                  {communicationTypeFilterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <div className="flex items-center gap-3 pb-1">
                <SubmitButton variant="secondary">Apply filters</SubmitButton>
                {hasFilters ? <ButtonLink href={returnPath} variant="secondary">Clear filters</ButtonLink> : null}
              </div>
            </form>
          </Card>

          {noCommunicationsYet ? (
            <EmptyState title="No communications yet" message="Log a note after the next client or carrier touch." />
          ) : null}

          {noFilteredResults ? (
            <Card className="grid gap-3">
              <p className="font-medium text-slate-950">No communications match these filters.</p>
              {hasFilters ? <div><ButtonLink href={returnPath} variant="secondary">Clear filters</ButtonLink></div> : null}
            </Card>
          ) : null}

          {!noCommunicationsYet && !noFilteredResults ? (
            <>
              <Card className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Matching timeline items</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredActivities.length} total</p>
                  <p className="mt-1 text-sm text-slate-600">Based on your current search and type filters.</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Latest matching update</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{latestMatchingUpdate ? formatDateTime(latestMatchingUpdate) : "None"}</p>
                  <p className="mt-1 text-sm text-slate-600">Most recent matching communication date and time.</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Calls / Emails / Texts</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{callCount} / {emailCount} / {textCount}</p>
                  <p className="mt-1 text-sm text-slate-600">Overall counts across this claim timeline.</p>
                </div>
              </Card>

              <Section title="Claim activity timeline" description="Newest first so the office can quickly understand what happened and what changed.">
                <div className="grid gap-3">
                  {filteredActivities.map((activity) => (
                    <Card key={activity.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{activity.subject}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDateTime(activity.occurredAt)} · {activity.userName}{activity.contactName ? ` · ${activity.contactName}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{labelFromEnum(activity.category)}</Badge>
                          <Badge>{activity.typeLabel}</Badge>
                        </div>
                      </div>
                      {activity.body ? <p className="mt-3 text-sm leading-6 text-slate-700">{activity.body}</p> : null}
                    </Card>
                  ))}
                </div>
              </Section>
            </>
          ) : null}
        </div>

        <aside className="grid gap-6 content-start">
          <Card className="grid gap-4">
            <h2 className="text-base font-semibold text-slate-950">Add to timeline</h2>

            {!selectedAction ? (
              <div className="grid gap-2">
                <ButtonLink href={`${returnPath}?action=log-communication&quickType=NOTE`} variant="primary">Add note</ButtonLink>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`${returnPath}?action=log-communication&quickType=CALL`} variant="secondary">Log call</ButtonLink>
                  <ButtonLink href={`${returnPath}?action=log-communication&quickType=EMAIL`} variant="secondary">Log email</ButtonLink>
                  <ButtonLink href={`${returnPath}?action=log-communication&quickType=TEXT`} variant="secondary">Log text</ButtonLink>
                  <ButtonLink href={`${returnPath}?action=log-communication&quickType=MEETING`} variant="secondary">Log meeting</ButtonLink>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Capture client, carrier, and office touches so anyone can pick up the claim.</p>
              </div>
            ) : null}

            {selectedAction === "log-communication" ? (
              <ActionForm action={createActivityWithState} className="grid gap-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <p className="text-sm leading-6 text-slate-600">Save the important part of each client, carrier, or office touch so anyone can pick up the claim later.</p>
                {messageTemplates.length > 0 ? (
                  <Field label="Start from a template" hint="Used in claim communications. Or write your own note below.">
                    <select name="activityTemplateKey" defaultValue="" className={selectClassName}>
                      <option value="">Or write your own</option>
                      {messageTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}{template.subject ? ` · ${template.subject}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="Type" hint="Pick the closest kind of contact.">
                  <select name="type" className={selectClassName} defaultValue={quickType}>
                    {activityTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Person (optional)" hint="Use this if the note is about the claim contact.">
                  <select name="contactId" defaultValue={claim.contactId} className={selectClassName}>
                    <option value="">No specific person</option>
                    <option value={claim.contactId}>{fullName(claim.contact)}</option>
                  </select>
                </Field>
                <Field label="Date and time" hint="Leave blank to use the current time."><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
                <Field label="Subject" hint="Example: Carrier requested photos, client called about check, inspection completed. You can leave this blank if a message template supplies it."><input name="subject" className={inputClassName} /><FieldError name="subject" /></Field>
                <Field label="Or write your own notes" hint="Use the template wording or type a custom note."><textarea name="body" className={textareaClassName} /></Field>
                <input type="hidden" name="allowBodyOnly" value="on" />
                <div className="flex flex-wrap items-center gap-2">
                  <SubmitButton>Save claim note</SubmitButton>
                  <ButtonLink href={returnPath} variant="secondary">Back to actions</ButtonLink>
                </div>
              </ActionForm>
            ) : null}
          </Card>
        </aside>
      </div>
    </>
  );
}
