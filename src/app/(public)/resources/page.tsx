import type { Metadata } from "next";
import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Resources | AdjusterDesk",
  description: "Getting started, spreadsheet import, demo walkthrough, claim tracking checklist, and template resources for AdjusterDesk.",
};

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
        description="These sections will hold first-use guides, spreadsheet help, walkthrough material, checklists, and templates as the pilot site grows."
      />
      <PublicSection title="Resource library">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-normal text-teal-800">Coming soon</p>
              <h2 className="mt-2 text-base font-semibold text-slate-950">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{resource.description}</p>
            </div>
          ))}
        </div>
      </PublicSection>
      <CtaBand title="Need the walkthrough before the resources are filled in?" description="Request a demo and we can cover spreadsheet import, claim tracking habits, templates, and the daily Today view directly." />
    </>
  );
}