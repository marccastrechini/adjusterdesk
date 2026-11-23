import { CheckList, CtaBand, FeatureGrid, PublicPageHeader, PublicSection, clientPaymentsPoints, extendedFeatureHighlights } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";
import { brandName } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Claim Tracker for Public Adjusters | ${brandName}`,
  description: "A claim tracker for public adjusters. Follow claims, contacts, documents, deadlines, settlements, and fee invoices. Clients pay fees by Stripe card or ACH.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Features"
        title="Claim tracker for public adjusters"
        description={`${brandName} keeps the important claim details together without asking a small public adjusting office to learn a heavy system.`}
      />
      <PublicSection title="Core features">
        <FeatureGrid features={extendedFeatureHighlights} />
      </PublicSection>
      <PublicSection title="Client payments" description="Send the client a payment link for the PA fee and see it marked paid on the claim." tone="white">
        <CheckList items={clientPaymentsPoints} />
      </PublicSection>
      <CtaBand title="Want to see how these pieces fit together?" description="Request a demo and walk through a claim from intake to settlement payment and fee invoice tracking." />
    </>
  );
}