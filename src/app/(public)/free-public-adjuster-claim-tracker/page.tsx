import { Download, Zap } from "lucide-react";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
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
        description="Still tracking claims in a spreadsheet? Download a clean, organized claim tracker template to get started. When the spreadsheet gets messy, move to AdjusterDesk."
      />

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

      <PublicSection title="Use the free tracker to get organized" description="Download the template, add your current leads and open claims, and track follow-ups and settlements. It's a good starting point.">
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
              <a
                href="/downloads/public-adjuster-claim-tracker.csv"
                download="public-adjuster-claim-tracker.csv"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download Tracker (CSV)
              </a>
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
            <h3 className="text-base font-semibold text-slate-950">Start a free trial</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Move your tracker into AdjusterDesk and explore how it handles follow-ups, client updates, payments, and fees. 14-day free trial, no credit card required.</p>
            <div className="mt-4">
              <PublicButtonLink href="/signup" variant="primary">
                Start Free Trial
              </PublicButtonLink>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Talk to us</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Moving from a spreadsheet? Let&apos;s talk through your setup and how AdjusterDesk fits your office workflow.</p>
            <div className="mt-4">
              <PublicButtonLink href="/demo" variant="secondary">
                Schedule Demo
              </PublicButtonLink>
            </div>
          </div>
        </div>
      </PublicSection>

      <CtaBand
        title="Download the free tracker or start with AdjusterDesk."
        description="The free spreadsheet is a good starting point. When you outgrow it, AdjusterDesk handles leads, claims, documents, follow-ups, settlements, and fees in one organized workspace."
      />
    </>
  );
}
