import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Resources | AdjusterDesk",
  description: "Getting started, spreadsheet import, demo walkthrough, claim tracking checklist, and template resources for AdjusterDesk.",
  path: "/resources",
});

const resources = [
  {
    title: "Getting started",
    description: "A simple first-day guide for setting up users, leads, claims, documents, tasks, and the Today view.",
  },
  {
    title: "Importing from spreadsheets",
    description: "Plain guidance for cleaning up lead and claim spreadsheets before importing them into AdjusterDesk.",
  },
  {
    title: "Demo walkthrough",
    description: "A short walkthrough of the main office flow from lead intake to claim tracking, documents, money, and reports.",
  },
  {
    title: "Small office claim tracking checklist",
    description: "A practical checklist for keeping client details, carrier details, deadlines, documents, payments, fees, and invoices visible.",
  },
  {
    title: "Templates",
    description: "Starter examples for follow-up tasks, document requests, and claim communication notes.",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Resources"
        title="Practical resources for small public adjusting offices."
        description="These sections will hold first-use guides, spreadsheet help, walkthrough material, checklists, and templates as the site grows."
      />
      <PublicSection title="Resource library">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-normal text-teal-800">Available now</p>
            <h2 className="mt-2 text-base font-semibold text-slate-950">Founding office offer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Try AdjusterDesk with your first 10 active claims and review the feedback-period offer.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PublicButtonLink href="/founding-public-adjuster-offices" variant="secondary">
                View Founding Office Page
              </PublicButtonLink>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <PublicButtonLink href="/free-public-adjuster-claim-tracker" variant="secondary">
                Download Free Tracker
              </PublicButtonLink>
            </div>
          </div>
          {resources.map((resource) => (
            <div key={resource.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-800">Coming soon</p>
              <h2 className="mt-2 text-base font-semibold text-slate-950">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{resource.description}</p>
            </div>
          ))}
        </div>
      </PublicSection>
      <CtaBand title="Need help choosing your next step?" description="Start free trial, download the free tracker, or email us with practical questions about your office workflow." />
    </>
  );
}