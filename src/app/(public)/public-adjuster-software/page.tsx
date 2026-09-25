import { FoundingOfferSummary } from "@/components/founding-offer-summary";
import { CtaBand, FeatureCard, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { FOUNDING_SOLO_SIGNUP_HREF } from "@/lib/founding-offer";
import { publicPageMetadata } from "@/lib/public-metadata";
import {
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  ContactRound,
  FileText,
  HandCoins,
  ReceiptText,
} from "lucide-react";

export const metadata = publicPageMetadata({
  title: "Public Adjuster Software for Small Offices | AdjusterDesk",
  description: "AdjusterDesk keeps leads, claims, documents, follow-ups, client updates, settlements, fees, and invoices organized for small public adjusting offices.",
  path: "/public-adjuster-software",
});

const softwareFeatures = [
  {
    title: "Lead and claim intake",
    description: "Capture client contact, property details, carrier, claim number, loss type, and date of loss without building a complicated file first.",
    icon: ClipboardList,
  },
  {
    title: "Today view for daily work",
    description: "See overdue tasks, due dates, carrier follow-ups, and outstanding receivables before the day gets noisy.",
    icon: CalendarCheck,
  },
  {
    title: "Documents and photos",
    description: "Keep claim documents, photos, inspection notes, and requests organized close to the claim.",
    icon: FileText,
  },
  {
    title: "Client communication",
    description: "Track calls, emails, text notes, and meetings tied to each claim and send client status updates directly.",
    icon: ContactRound,
  },
  {
    title: "Settlement and fee tracking",
    description: "Record carrier offers, settlements, checks, partial payments, fee percentages, invoices, and balances due.",
    icon: HandCoins,
  },
  {
    title: "Office receivables",
    description: "See all outstanding fees and invoices, payment history, and balances still due from one view.",
    icon: ReceiptText,
  },
];

const useCases = [
  {
    title: "Solo adjusters",
    description: "One person, one simple workspace. No spreadsheets, no scattered email folders, no lost follow-ups.",
  },
  {
    title: "Two to five-person offices",
    description: "Give each adjuster a shared view of leads, claims, assigned tasks, documents, and money still owed.",
  },
  {
    title: "Spreadsheet-to-system migration",
    description: "Built for offices ready to move beyond spreadsheets but want practical language and straightforward workflows.",
  },
];

const organizingItems = [
  "Lead and client details",
  "Property information",
  "Carrier and policy data",
  "Claim dates and deadlines",
  "Document requests",
  "Follow-up tasks",
  "Client communication",
  "Settlement amounts",
  "Fee calculations",
  "Invoice tracking",
  "Payment status",
  "Office receivables",
];

export default function PublicAdjusterSoftwarePage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Office management software"
        title="Public Adjuster Software for Small Offices"
        description="Built for solo adjusters and 2-5 person public adjusting offices. AdjusterDesk keeps leads, claims, documents, follow-ups, client updates, settlements, fees, and invoices in one simple workspace instead of spreadsheets, inboxes, and memory."
      />

      <PublicSection title="Who this is for and what to do first" tone="white">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Who it&apos;s for</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Solo public adjusters and small 2-5 person offices handling active claim files.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">What problem it solves</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Stops claim work from being scattered across spreadsheets, email folders, text threads, and reminders.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">What to do first</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start your trial and add your first 10 active claims with follow-up dates and next steps.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Why it stays simple</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Uses plain public-adjuster language your office already uses. No enterprise setup project required.</p>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        title="What AdjusterDesk organizes for you"
        description="A small public adjusting office needs one place to manage leads, claims, follow-ups, documents, payments, and fees. AdjusterDesk handles the pieces you already work with every day."
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {organizingItems.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-teal-700" aria-hidden />
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Built for the way small offices work" description="AdjusterDesk is designed for offices that track claims in practical terms, not complicated enterprise configurations.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {softwareFeatures.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </PublicSection>

      <PublicSection title="AdjusterDesk for different size offices" tone="slate">
        <div className="grid gap-4 md:grid-cols-3">
          {useCases.map(({ title, description }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        title="Start simple with your first 10-50 active claims"
        description="AdjusterDesk is built so a small office can get organized without a long setup project."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Step 1", "Add current leads and open claims with basic details."],
            ["Step 2", "Track follow-ups, documents, and client updates from one workspace."],
            ["Step 3", "Close the loop with settlements, fees, and invoices."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Founding office offer" description="First 10 offices. Start the desk with your first 10 active claims." tone="slate">
        <FoundingOfferSummary heading="Founding seats" headingLevel="h3" showPageLink />
      </PublicSection>

      <PublicSection title="Get started today" description="Choose Solo or Small Office. Stripe Checkout collects a card, and $0 is due during the 14-day trial." tone="white">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <BriefcaseBusiness className="mt-1 h-6 w-6 flex-none text-teal-700" aria-hidden />
            <div>
              <h3 className="text-base font-semibold text-slate-950">Start the desk</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Create a workspace, add your first 10 active claims, and run the next follow-ups from one place.</p>
              <div className="mt-4">
                <PublicButtonLink href={FOUNDING_SOLO_SIGNUP_HREF} variant="primary" eventName="trial_start_click">
                  Start Solo founding desk
                </PublicButtonLink>
              </div>
            </div>
          </div>
        </div>
      </PublicSection>

      <CtaBand
        title="Ready to put claims, follow-ups, documents, and fees on one desk?"
        description="First 10 founding offices: $0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months. Checkout collects a card. $0 is due during the 14-day trial Stripe starts today."
        primaryHref={FOUNDING_SOLO_SIGNUP_HREF}
        primaryLabel="Start Solo founding desk"
      />
    </>
  );
}
