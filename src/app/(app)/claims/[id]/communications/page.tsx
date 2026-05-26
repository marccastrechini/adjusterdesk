import { ClaimTabs } from "@/components/claim-tabs";
import { Badge, ButtonLink, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createActivity } from "@/lib/actions";
import { formatDateTime, fullName, labelFromEnum } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { activityTypeOptions } from "@/lib/options";
import { getClaim } from "@/lib/queries";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimCommunicationsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { claim } = await getClaim(id);
  const notice = getNoticeMessage(query);
  const returnPath = `/claims/${claim.id}/communications`;

  return (
    <>
      <PageHeader title={`${fullName(claim.contact)} communications`} description="Keep a manual record of calls, emails, texts, meetings, inspections, and important notes." actions={<ButtonLink href={`/claims/${claim.id}`} variant="secondary">Claim overview</ButtonLink>} />
      <ClaimTabs claimId={claim.id} />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section title="Communication log">
          {claim.activities.length === 0 ? (
            <EmptyState title="No communications yet" message="Log a note after the next client or carrier touch." />
          ) : (
            <div className="grid gap-3">
              {claim.activities.map((activity) => (
                <Card key={activity.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{activity.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateTime(activity.occurredAt)} · {activity.user?.name ?? "Office"}{activity.contact ? ` · ${fullName(activity.contact)}` : ""}
                      </p>
                    </div>
                    <Badge>{labelFromEnum(activity.type)}</Badge>
                  </div>
                  {activity.body ? <p className="mt-3 text-sm leading-6 text-slate-700">{activity.body}</p> : null}
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Card className="grid gap-4 content-start">
          <h2 className="text-base font-semibold text-slate-950">Log communication</h2>
          <p className="text-sm leading-6 text-slate-600">Save the important part of each client, carrier, or office touch so anyone can pick up the claim later.</p>
          <form action={createActivity} className="grid gap-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <input type="hidden" name="contactId" value={claim.contactId} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Field label="Type" hint="Pick the closest kind of contact.">
              <select name="type" className={selectClassName} defaultValue="NOTE">
                {activityTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Date and time" hint="Leave blank to use the current time."><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
            <Field label="Subject" required hint="Example: Carrier requested photos, client called about check, inspection completed."><input name="subject" required className={inputClassName} /></Field>
            <Field label="Notes" hint="Write the useful details, not a perfect transcript."><textarea name="body" className={textareaClassName} /></Field>
            <SubmitButton>Save claim note</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
