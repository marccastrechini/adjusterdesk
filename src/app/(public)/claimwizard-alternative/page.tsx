import { Check } from "lucide-react";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "ClaimWizard Alternative | AdjusterDesk for Small Public Adjusters",
  description: "AdjusterDesk is a simpler, lighter-weight workspace alternative for small public adjusting offices that want practical claim tracking without enterprise complexity.",
  path: "/claimwizard-alternative",
});

const comparisonItems = [
  {
    feature: "Setup complexity",
    claimwizard: "Multi-step configuration, field customization",
    adjusterdesk: "Start immediately with sensible defaults",
  },
  {
    feature: "Pricing for small offices",
    claimwizard: "Per-user enterprise model",
    adjusterdesk: "Flat team pricing (Solo, Small Office, Team)",
  },
  {
    feature: "User interface",
    claimwizard: "Field-heavy, lots of options",
    adjusterdesk: "Clean, practical, low-tech friendly",
  },
  {
    feature: "Today view / dashboards",
    claimwizard: "Configurable but complex",
    adjusterdesk: "Built-in, clear priorities at a glance",
  },
  {
    feature: "Follow-up and task management",
    claimwizard: "Manual task entry",
    adjusterdesk: "Automatic task suggestions with easy capture",
  },
  {
    feature: "Client-facing features",
    claimwizard: "Limited self-service",
    adjusterdesk: "Secure client status pages, document requests",
  },
  {
    feature: "Settlement and fee tracking",
    claimwizard: "Basic",
    adjusterdesk: "Offers, settlements, checks, partial payments, fees, invoices",
  },
  {
    feature: "Team coordination",
    claimwizard: "Workable but requires more setup",
    adjusterdesk: "Shared workspace, task assignment, office views",
  },
  {
    feature: "Mobile-friendly",
    claimwizard: "Limited",
    adjusterdesk: "Responsive web app for phones and tablets",
  },
  {
    feature: "Support",
    claimwizard: "Standard enterprise support",
    adjusterdesk: "Direct email support for small offices",
  },
];

const whyAdjusterdesk = [
  "Built specifically for solo and small-office workflows, not enterprise claim departments",
  "Pricing stays flat for small offices: Solo $49, Small Office $99, Team $199 per month",
  "No lengthy onboarding or field customization required to get started",
  "Strong focus on the pieces small offices actually use: leads, claims, follow-ups, documents, settlements, fees",
  "Secure client status pages and document requests without complex user provisioning",
  "Simple, practical language throughout the app—no claim examiner jargon",
];

export default function ClaimWizardAlternativePage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Software comparison"
        title="ClaimWizard Alternative for Small Public Adjusters"
        description="ClaimWizard is a strong enterprise option, but if you run a solo or small office, AdjusterDesk is a simpler, lighter-weight solution built specifically for your workflow."
      />

      <PublicSection
        title="A simpler option for small offices"
        description="ClaimWizard is designed for large claim departments with deep customization. AdjusterDesk is designed for small public adjusting offices that want to get organized quickly and stay practical."
        tone="slate"
      >
        <div className="space-y-4">
          {comparisonItems.map(({ feature, claimwizard, adjusterdesk }) => (
            <div key={feature} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
              <div className="font-semibold text-slate-950">{feature}</div>
              <div className="border-l border-slate-200 pl-4 text-sm leading-6 text-slate-600">{claimwizard}</div>
              <div className="border-l border-teal-200 bg-teal-50 pl-4 text-sm leading-6 text-slate-700">
                <div className="font-medium text-slate-950">{adjusterdesk}</div>
              </div>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Why AdjusterDesk for small public adjusting offices" tone="white" description="We built AdjusterDesk specifically for solo and small-office workflows. Here's what that means for you.">
        <div className="grid gap-4 sm:grid-cols-2">
          {whyAdjusterdesk.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Check className="mt-0.5 h-5 w-5 flex-none text-teal-700" aria-hidden />
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="How AdjusterDesk works" tone="slate">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">For solo adjusters</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">One person, one simple workspace. Keep clients, claims, documents, follow-ups, and receivables organized without spreadsheets or scattered email.</p>
            <ul className="mt-4 space-y-2">
              {["Solo plan: $49/month", "1 active user", "Unlimited claims", "All core features"].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-teal-700">&rarr;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">For small offices</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Two to five people sharing a workspace. Coordinate who&apos;s doing what, share client files, track assignments, and stay aligned on follow-ups and money.</p>
            <ul className="mt-4 space-y-2">
              {["Small Office plan: $99/month", "Up to 3 active users", "Shared workspace", "Team task assignment"].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-teal-700">&rarr;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PublicSection>

      <PublicSection title="No complex setup. No per-user pricing. No enterprise features you don&apos;t need." tone="white">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-6">
          <h3 className="text-base font-semibold text-slate-950">Start your free trial</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">Create a workspace with AdjusterDesk and explore how it handles your leads, claims, follow-ups, documents, settlements, and fees. 14-day free trial. No credit card required.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PublicButtonLink href="/signup" variant="primary">
              Start Free Trial
            </PublicButtonLink>
            <PublicButtonLink href="/demo" variant="secondary">
              Talk to Us
            </PublicButtonLink>
          </div>
        </div>
      </PublicSection>

      <CtaBand
        title="Move past enterprise complexity."
        description="AdjusterDesk is built for small offices. Simple pricing, practical workflows, no over-engineered features. Try it free."
      />
    </>
  );
}
