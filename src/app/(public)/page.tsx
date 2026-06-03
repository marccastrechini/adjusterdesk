import { CtaBand, FeatureGrid, PublicHero, PublicSection, StepList, WorkspacePreview, featureHighlights } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "AdjusterDesk | Simple Workspace for Public Adjusters",
  description: "AdjusterDesk keeps claims, clients, documents, follow-ups, payments, fees, and invoices together for small public adjusting offices.",
  path: "/",
});

const scatteredItems = ["Spreadsheets", "Email folders", "Text messages", "Scattered documents", "Calendar reminders", "QuickBooks notes"];

const howItWorksSteps = [
  {
    title: "Start with a lead or client",
    description: "Capture the basic contact, property, loss, and follow-up details without building a complicated file first.",
  },
  {
    title: "Open the claim file",
    description: "Track the carrier, policy, claim number, deadlines, documents, notes, and assigned office user together.",
  },
  {
    title: "Work from Today",
    description: "See overdue tasks, due dates, carrier follow-ups, missing client documents, and receivables before the day gets noisy.",
  },
  {
    title: "Close the money loop",
    description: "Record offers, settlements, checks, fee invoices, partial payments, and balances due from the same workspace.",
  },
];

export default function HomePage() {
  return (
    <>
      <PublicHero
        eyebrow="Simple public adjusting office workspace"
        title="AdjusterDesk"
        description="Keep claims, clients, documents, follow-ups, payments, deadlines, fees, and invoices in one practical place for a solo or small public adjusting office."
      >
        <WorkspacePreview />
      </PublicHero>

      <PublicSection title="When the office is spread across too many places" tone="slate">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <p className="text-base leading-7 text-slate-600">
              Small public adjusting offices often run on a mix of spreadsheets, inboxes, paper templates, reminders, accounting tools, and memory. That can work for a while, until follow-ups, deadlines, missing documents, settlement checks, and fee invoices all need attention at once.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {scatteredItems.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </PublicSection>

      <PublicSection
        title="One workspace for the daily claim work"
        description="AdjusterDesk is a simple office workspace for tracking the pieces a small public adjusting firm already works with every day."
      >
        <FeatureGrid features={featureHighlights} />
      </PublicSection>

      <PublicSection title="Built for solo adjusters and small offices" tone="slate">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Solo adjusters", "Keep client files, claim dates, follow-up notes, and payments organized without running the office from your inbox."],
            ["Two to five-person offices", "Give each person a shared view of open leads, active claims, assigned tasks, and money still outstanding."],
            ["Spreadsheet-heavy firms", "Move toward a cleaner system while keeping the practical claim language your office already uses."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="How it works" description="A straightforward flow from first call to settlement and fee tracking.">
        <StepList steps={howItWorksSteps} />
      </PublicSection>

      <CtaBand title="Start with the plan that fits your office." description="Choose your plan, create your workspace, and start using AdjusterDesk now. No credit card required. Subscribe from Billing when you are ready." />
    </>
  );
}