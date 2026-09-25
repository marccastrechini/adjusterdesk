import { Download, Zap } from "lucide-react";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrackedDownloadLink } from "@/components/tracked-download-link";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Free Public Adjuster Claim Tracker | AdjusterDesk",
  description: "Download a free claim tracker spreadsheet template to organize leads, clients, properties, carriers, claims, follow-ups, settlements, fees, and invoices.",
  path: "/free-public-adjuster-claim-tracker",
});

const trackerColumns = [
  ["Claim Name", "Quick claim reference"],
  ["Client Name", "Full name for contact"],
  ["Phone", "Primary contact number"],
  ["Email", "Client email address"],
  ["Property Address", "Location of loss"],
  ["Carrier", "Insurance carrier name"],
  ["Claim Number", "Insurance claim reference"],
  ["Loss Type", "Water, wind, fire, hail, etc."],
  ["Date of Loss", "When the loss occurred"],
  ["Claim Status", "Open, settled, disputed, denied"],
  ["Next Follow-Up Date", "When to call or check"],
  ["Documents Needed", "Photos, proof of loss, receipts"],
  ["Settlement Amount", "Agreed settlement value"],
  ["PA Fee %", "Fee percentage structure"],
  ["PA Fee Amount", "Fee dollar amount"],
  ["Invoice Status", "Sent, paid, pending"],
  ["Notes", "Important details and history"],
];

const whenToUpgrade = [
  "You're tracking more than 10-15 active claims",
  "Spreadsheet updates are hard to coordinate between office staff",
  "You need to see client status pages or send document requests",
  "Tracking follow-ups, deadlines, and payments feels disorganized",
  "You want to track who did what work without separate notes",
];

export default function FreeClaimTrackerPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Free template"
        title="Free Public Adjuster Claim Tracker"
        description="A claim tracker spreadsheet for leads, follow-ups, documents, settlements, and fees. When email, memory, and scattered files are where claims slip, the AdjusterDesk founding desk is the next step."
      />

      <PublicSection title="Start in two practical steps" tone="white">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Step 1: Use the free tracker</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track lead/client details, claim status, follow-ups, documents, settlement amounts, and fee status in one clean sheet.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Step 2: Move to AdjusterDesk</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">When tracking gets harder across active claims, start your free trial and run claim work from one workspace.</p>
          </div>
        </div>
      </PublicSection>

      <PublicSection title="What the free tracker includes" tone="slate" description="A simple spreadsheet template with practical columns for organizing everything a small public adjusting office needs to track for each claim.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trackerColumns.map(([column, purpose]) => (
            <div key={column} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-950">{column}</p>
              <p className="mt-1 text-sm text-slate-600">{purpose}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Use the free tracker to get organized" description="Download the template, add your current leads and open claims, and track follow-ups and settlements. Then use the software page to see when to move beyond the sheet.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">What you get</h3>
            <ul className="mt-4 space-y-3">
              {[
                "Pre-built columns for all claim information",
                "Simple rows for each claim",
                "Ready to add your leads and claims",
                "Works with Excel, Google Sheets, or any spreadsheet tool",
                "Completely free, no login required",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-teal-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <TrackedDownloadLink
                href="/downloads/public-adjuster-claim-tracker.csv"
                download="public-adjuster-claim-tracker.csv"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download Free Tracker (CSV)
              </TrackedDownloadLink>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">After download: add your current active claims, set next follow-up dates, and mark missing documents so nothing slips.</p>
            <div className="mt-4">
              <PublicButtonLink href="/public-adjuster-software" variant="secondary">
                See when to move to software
              </PublicButtonLink>
            </div>
          </div>

          <div className="rounded-lg border border-teal-200 bg-teal-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Zap className="mt-1 h-5 w-5 flex-none text-teal-700" aria-hidden />
              <div>
                <h3 className="text-base font-semibold text-slate-950">When spreadsheets get messy</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">The free tracker is great for getting started, but when you need to coordinate between team members, send client updates, track payment status, or manage follow-ups reliably, AdjusterDesk makes it easier.</p>
              </div>
            </div>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        title="Signs it's time to move to AdjusterDesk"
        description="The free tracker works for getting organized, but AdjusterDesk handles what spreadsheets can't."
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {whenToUpgrade.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-teal-700" />
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Ready for more than a spreadsheet?" tone="white">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Start the founding desk</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">First 10 offices: $0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months. Start with your first 10 active claims. Checkout collects a card, and $0 is due during the 14-day trial Stripe starts today. The 90-day $0 period and the $29/$49 lock are applied after you start.</p>
            <div className="mt-4">
              <PublicButtonLink href="/founding-public-adjuster-offices" variant="primary" eventName="trial_start_click">
                See founding desk offer
              </PublicButtonLink>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Questions about moving to software?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Email us about your specific workflow, office size, claim volume, or how the software could help your team.</p>
            <div className="mt-4">
              <a
                href="mailto:hello@adjusterdesk.xyz"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                Email us
              </a>
            </div>
          </div>
        </div>
      </PublicSection>

      <CtaBand
        title="When the sheet is not enough, start the desk."
        description="First 10 founding offices: $0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months. Checkout collects a card. $0 is due during the 14-day trial Stripe starts today."
        primaryHref="/founding-public-adjuster-offices"
        primaryLabel="See founding desk offer"
      />
    </>
  );
}
