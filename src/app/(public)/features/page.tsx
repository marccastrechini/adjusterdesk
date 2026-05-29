import type { Metadata } from "next";
import { CtaBand, FeatureGrid, PublicPageHeader, PublicSection, extendedFeatureHighlights } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Features | AdjusterDesk",
  description: "Simple claim tracking, contacts, documents, follow-ups, payments, fees, invoices, templates, and spreadsheet import for small public adjusting offices.",
};

export default function FeaturesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Features"
        title="Practical tools for the work your office already does."
        description="AdjusterDesk keeps the important claim details together without asking a small public adjusting office to learn a heavy system."
      />
      <PublicSection title="Core features">
        <FeatureGrid features={extendedFeatureHighlights} />
      </PublicSection>
      <CtaBand title="Want to see how these pieces fit together?" description="Request a demo and walk through a claim from intake to settlement payment and fee invoice tracking." />
    </>
  );
}