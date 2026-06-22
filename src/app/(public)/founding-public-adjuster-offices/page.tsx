import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";
import { CheckCircle2 } from "lucide-react";

export const metadata = publicPageMetadata({
  title: "Founding Office Program | AdjusterDesk",
  description: "Join the AdjusterDesk founding office program. Try AdjusterDesk with your first 10 active claims and shape how the product evolves.",
  path: "/founding-public-adjuster-offices",
});

const whatYouGetFeatures = [
  "14-day free trial, no credit card required",
  "Try AdjusterDesk with your first 10 active claims",
  "Priority email support during feedback period",
  "Early pricing locked in for 12 months",
  "Direct input on feature priorities",
];

const useCases = [
  {
    title: "Solo adjusters",
    description: "One person running claims from a spreadsheet, email, and memory. Ready to get organized.",
  },
  {
    title: "Small offices (2-5 people)",
    description: "Team coordination is becoming a pain. Spreadsheet updates are hard to sync across people.",
  },
  {
    title: "Offices outgrowing spreadsheets",
    description: "Follow-ups slip, documents are scattered, and settlements need a better tracking system.",
  },
];

const whyLowRisk = [
  "Start with your first 10 active claims—run your full book in parallel.",
  "No lock-in. Cancel anytime, keep your data.",
  "Keep your current spreadsheet workflow running. Experiment without disruption.",
  "Data exports available anytime. No vendor lock-in.",
];

export default function FoundingPublicAdjusterOfficesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Founding Office Program"
        title="Build AdjusterDesk with your office's workflow"
        description="Still managing claims in a spreadsheet? Start with a cleaner public adjuster claim tracker. When the spreadsheet starts becoming too manual, AdjusterDesk gives you the same structure in a shared workspace for claims, clients, documents, follow-ups, payments, and deadlines."
      />

      <PublicSection title="Who this is for" tone="white">
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
        title="What you get as a founding office"
        description="Access to AdjusterDesk with feedback-period support and early pricing."
        tone="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {whatYouGetFeatures.map((feature) => (
            <div key={feature} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-teal-700" aria-hidden />
              <p className="text-sm leading-6 text-slate-700">{feature}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Why it's low-risk to try" description="No commitment beyond 14 days. Keep your current workflows running. Cancel anytime.">
        <div className="grid gap-4 md:grid-cols-2">
          {whyLowRisk.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        title="Getting started"
        description="Three options depending on where you are right now."
        tone="white"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Ready to try software",
              description: "You're past spreadsheet limits. Start your 14-day free trial now and add your first 10 active claims.",
              cta: "Start Free Trial",
              href: "/signup",
            },
            {
              title: "Want to see the tracker first",
              description: "Download the free claim tracker template, organize your current claims, then move to AdjusterDesk when you're ready.",
              cta: "Download Free Tracker",
              href: "/free-public-adjuster-claim-tracker",
            },
            {
              title: "Have questions",
              description: "Email us about your specific workflow, office size, claim volume, or how the founding office program works.",
              cta: "Email us",
              href: "mailto:hello@adjusterdesk.xyz",
            },
          ].map(({ title, description, cta, href }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              <div className="mt-4">
                {href.startsWith("mailto") ? (
                  <a
                    href={href}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                  >
                    {cta}
                  </a>
                ) : (
                  <PublicButtonLink
                    href={href}
                    variant={title === "Ready to try software" ? "primary" : "secondary"}
                    eventName="trial_start_click"
                  >
                    {cta}
                  </PublicButtonLink>
                )}
              </div>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="The founding office feedback period" tone="slate">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-6">
          <h3 className="text-base font-semibold text-slate-950">How the feedback period works</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Founding offices receive discounted early pricing during the feedback period in exchange for practical product feedback.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-teal-700" />
              <span>Use the software with 5-10 of your real active claims</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-teal-700" />
              <span>Share what works and what doesn&apos;t via email or simple feedback form</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-teal-700" />
              <span>Let us know when you&apos;re ready to move more claims over</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-teal-700" />
              <span>Your feedback directly shapes our product priorities</span>
            </li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-600">
            Founding office pricing locks in for 12 months. Pricing and offer availability can change as we learn from early offices.
          </p>
        </div>
      </PublicSection>

      <PublicSection
        title="Start simple with your first 10-50 active claims"
        description="AdjusterDesk is built so a small office can get organized without a long setup project."
        tone="white"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Step 1", "Add your first 10 active claims with basic details: client, property, carrier, dates, follow-ups."],
            ["Step 2", "Track documents, client updates, and follow-up tasks from one workspace for 14 days."],
            ["Step 3", "Send settlements and invoices. See if the shared view helps your office stay organized."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <CtaBand
        title="Ready to try AdjusterDesk with your first 10 claims?"
        description="Choose your path: start a free trial now, download the free claim tracker first, or email us with questions. No credit card required. Cancel anytime."
      />
    </>
  );
}
