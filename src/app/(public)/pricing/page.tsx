import type { Metadata } from "next";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Pricing | AdjusterDesk",
  description: "Early-access pilot pricing information for AdjusterDesk, built for small public adjusting offices.",
};

const planNotes = [
  {
    title: "Pilot access",
    description: "Request demo for pilot access. We are using early conversations to make sure the product fits small public adjusting offices before final plans are published.",
  },
  {
    title: "Small office fit",
    description: "Simple plans for small public adjusting offices, with the needs of solo adjusters and two to five-person teams in mind.",
  },
  {
    title: "No heavy rollout",
    description: "The first version is designed around practical setup, current spreadsheets, current claim files, and the daily work your office already tracks.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Pricing"
        title="Simple plans for small public adjusting offices."
        description="Final pricing is not locked in yet. AdjusterDesk is currently focused on pilot access and practical fit for small public adjusting offices."
      />
      <PublicSection title="Early-access pricing approach">
        <div className="grid gap-4 md:grid-cols-3">
          {planNotes.map((note) => (
            <div key={note.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">{note.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{note.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-semibold text-slate-950">Request demo for pilot access.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            A demo is the best next step while pricing is being shaped around real solo and small-office workflows.
          </p>
          <div className="mt-4">
            <PublicButtonLink href="/demo" variant="primary">
              Request Demo
            </PublicButtonLink>
          </div>
        </div>
      </PublicSection>
      <CtaBand title="Start with a demo, not a pricing lock-in." description="We can walk through the product, your current office setup, and whether a pilot makes sense before any plan is finalized." />
    </>
  );
}