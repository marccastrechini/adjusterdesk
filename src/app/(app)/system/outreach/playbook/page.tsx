import { requireSystemOutreachContext } from "@/lib/app-context";
import { freeClaimTrackerUrl, trialSignupUrl } from "@/lib/outreach";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export default async function SystemOutreachPlaybookPage() {
  await requireSystemOutreachContext();

  return (
    <>
      <PageHeader
        title="AdjusterDesk - Outreach Playbook"
        description="Simple, practical outreach for solo to 5-person public adjusting offices."
        actions={<ButtonLink href="/system/outreach" variant="secondary">Back to outreach queue</ButtonLink>}
      />

      <Card className="grid gap-4 text-sm leading-6 text-slate-700">
        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">1. Outreach objective</h2>
          <p>
            Start helpful conversations with small public adjusting offices. Do not hard-sell software. Lead with a useful free claim tracker and ask for feedback on a
            simple workspace for the first 10 claims.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">2. Target prospect definition</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Solo to 5-person public adjusting firms.</li>
            <li>Likely using spreadsheets, scattered folders, and manual reminders.</li>
            <li>Feels pain from missed follow-ups, document sprawl, or unclear claim handoffs.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">3. Message positioning</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Lead with practical value: free claim tracker.</li>
            <li>Use plain language: small office, first 10 claims, fewer missed follow-ups.</li>
            <li>Tone should be low-pressure and respectful of their current process.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">4. Lead lifecycle/status definitions</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Not contacted: Added to queue, not reviewed yet.</li>
            <li>Ready for outreach: Reviewed and ready for Email 1.</li>
            <li>Email 1 sent: First outreach email sent with tracker link.</li>
            <li>Follow-up due: No response yet; follow-up should be sent.</li>
            <li>Replied - interested: Positive response and open to next step.</li>
            <li>Replied - not now: Replied but not ready right now.</li>
            <li>Fit check scheduled: Brief call scheduled to confirm fit.</li>
            <li>Trial created: Office started trial workspace.</li>
            <li>Bad fit: Outside current scope.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">5. First outreach email</h2>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            <p>Subject: Free claim tracker for your office</p>
            <p className="mt-2">Hi [Contact Name],</p>
            <p>
              I work with small public adjusting offices and wanted to share a free claim tracker you can use right away:
              {" "}
              <a href={freeClaimTrackerUrl} target="_blank" rel="noreferrer" className="text-teal-800 hover:text-teal-900 hover:underline">
                {freeClaimTrackerUrl}
              </a>
            </p>
            <p>
              I am also collecting feedback on a simple workspace for managing the first 10 claims without spreadsheet sprawl, scattered folders, and missed follow-ups.
            </p>
            <p>If you are open to it, what is one thing your office would want most in that workflow?</p>
            <p className="mt-2">Thanks,</p>
            <p>AdjusterDesk</p>
          </div>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">6. Follow-up email</h2>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            <p>Subject: Quick follow-up</p>
            <p className="mt-2">Hi [Contact Name],</p>
            <p>Quick follow-up in case my note got buried. Here is the free claim tracker again:</p>
            <p>
              <a href={freeClaimTrackerUrl} target="_blank" rel="noreferrer" className="text-teal-800 hover:text-teal-900 hover:underline">
                {freeClaimTrackerUrl}
              </a>
            </p>
            <p>And if useful, here is the simple workspace trial for the first 10 claims:</p>
            <p>
              <a href={trialSignupUrl} target="_blank" rel="noreferrer" className="text-teal-800 hover:text-teal-900 hover:underline">
                {trialSignupUrl}
              </a>
            </p>
            <p>No pressure. If now is not the right time, I can follow up later.</p>
            <p className="mt-2">Thanks,</p>
            <p>AdjusterDesk</p>
          </div>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">7. Short call script</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>"Thanks for taking a few minutes. I mainly want to understand your current process for the first 10 claims."</li>
            <li>"Where do things break down most often: spreadsheets, folders, follow-ups, or handoffs?"</li>
            <li>"If we could simplify one daily pain point, which one matters most to your office?"</li>
            <li>"If useful, I can set you up with a simple trial workspace and get your feedback."</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">8. Reply handling guide</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Interested: thank them, offer a short fit check, move to Replied - interested.</li>
            <li>Not now: acknowledge timing, ask if future follow-up is okay, move to Replied - not now.</li>
            <li>Question about product: answer plainly, avoid overpromising, use notes for objections.</li>
            <li>No response: set Follow-up due and send one practical follow-up.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">9. What not to do</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Do not use enterprise sales language or pressure tactics.</li>
            <li>Do not promise automation that does not exist.</li>
            <li>Do not spam multiple emails in a short window.</li>
            <li>Do not collect more data than needed for simple follow-up.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-base font-semibold text-slate-900">10. Daily operator routine</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Review queue and move new records to Ready for outreach when qualified.</li>
            <li>Send Email 1 to ready prospects and mark Email 1 sent.</li>
            <li>Work Follow-up due prospects next, then update follow-up dates.</li>
            <li>Process replies: interested, not now, fit check scheduled, trial created, or bad fit.</li>
            <li>Keep notes short and practical so another operator can pick up the thread quickly.</li>
          </ol>
        </section>
      </Card>
    </>
  );
}
