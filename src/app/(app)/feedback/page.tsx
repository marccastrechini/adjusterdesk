import { ActionForm, FieldError } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, inputClassName, Notice, PageHeader, Section, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";
import { createPilotFeedbackWithState } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";
import { getPilotFeedbackPageData } from "@/lib/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ratingOptions = [
  ["", "No rating"],
  ["5", "5 - Ready for daily use"],
  ["4", "4 - Mostly clear"],
  ["3", "3 - Needs polish"],
  ["2", "2 - Hard to use"],
  ["1", "1 - Blocks the office"],
] as const;

// TODO: Add owner review/export and notification routing once the pilot feedback process is defined.
export default async function FeedbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const notice = getNoticeMessage(params);
  const { firm, recentFeedback } = await getPilotFeedbackPageData();

  return (
    <>
      <PageHeader
        title="Pilot feedback"
        description="Capture notes from real demo and pilot sessions while the workflow is fresh."
      />
      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="grid content-start gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Send feedback</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use plain notes from the office: what was confusing, what took too long, what was missing, or what helped.
            </p>
          </div>
          <ActionForm action={createPilotFeedbackWithState} className="grid gap-3">
            <Field label="Page or workflow" hint="Examples: lead intake, claim documents, CSV import, money.">
              <input name="page" className={inputClassName} />
              <FieldError name="page" />
            </Field>
            <Field label="Rating" hint="Optional quick signal for pilot review.">
              <select name="rating" defaultValue="" className={selectClassName}>
                {ratingOptions.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
              </select>
              <FieldError name="rating" />
            </Field>
            <Field label="Feedback" required hint={`Workspace: ${firm.name}`}>
              <textarea name="message" required className={textareaClassName} placeholder="What should be clearer or easier for a small adjusting office?" />
              <FieldError name="message" />
            </Field>
            <SubmitButton>Send feedback</SubmitButton>
          </ActionForm>
        </Card>

        <Section title="Recent feedback" description="Latest pilot notes saved in this workspace.">
          {recentFeedback.length === 0 ? (
            <EmptyState title="No feedback yet" message="Pilot notes will appear here after someone sends the first note." />
          ) : (
            <div className="grid gap-3">
              {recentFeedback.map((entry) => (
                <Card key={entry.id} className="grid gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">{entry.page || "General feedback"}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {entry.user?.name ?? "Office user"} · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                    {entry.rating ? <Badge tone={entry.rating >= 4 ? "green" : entry.rating === 3 ? "amber" : "red"}>{entry.rating}/5</Badge> : <Badge>No rating</Badge>}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{entry.message}</p>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}