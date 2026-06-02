import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Terms | AdjusterDesk",
  description: "Plain-language terms for using AdjusterDesk.",
  path: "/terms",
});

const sections: TrustSection[] = [
  {
    title: "Use of the service",
    paragraphs: [
      "AdjusterDesk is a workspace for public adjusting offices to organize claims, clients, documents, follow-ups, deadlines, payments, fees, and invoices. Users should use the service only for lawful business purposes and in a way that respects clients, staff, carriers, and other users.",
    ],
  },
  {
    title: "Account responsibility",
    paragraphs: [
      "Each office is responsible for the users it invites, the information those users enter, and keeping sign-in credentials private. If an account may be misused, contact AdjusterDesk so access can be reviewed.",
    ],
  },
  {
    title: "Customer data ownership",
    paragraphs: [
      "Customer offices keep ownership of the claim, client, document, and business information they enter into AdjusterDesk. AdjusterDesk uses that information to provide, support, and improve the service.",
    ],
  },
  {
    title: "Acceptable use",
    items: [
      "Do not upload malicious files, attempt to bypass access controls, or interfere with the service.",
      "Do not use AdjusterDesk to store information that your office is not allowed to handle.",
      "Do not share another customer workspace or client information without permission.",
    ],
  },
  {
    title: "Plans, billing timing, and plan terms",
    paragraphs: [
      "Public pricing is shown for Solo, Small Office, and Team plans. Start using AdjusterDesk now, and billing begins only after your first full calendar month of usage. Paid access remains subject to the plan terms agreed for the customer office.",
    ],
  },
  {
    title: "Professional judgment and advice",
    paragraphs: [
      "AdjusterDesk is not legal advice, estimating advice, coverage advice, claim valuation advice, or a replacement for professional public-adjuster judgment. Offices remain responsible for their claim handling decisions, client communications, estimates, coverage positions, invoices, and business records.",
    ],
  },
  {
    title: "Availability and liability placeholder",
    paragraphs: [
      "AdjusterDesk aims to provide a reliable workspace, but no software service is perfect or always available. Liability, warranty, and dispute terms should be covered in the applicable customer agreement. Questions can be sent to hello@adjusterdesk.xyz.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Terms"
        title="Plain terms for using AdjusterDesk."
        description="A practical summary of service use, account responsibility, customer data, and product limits."
      />
      <PublicSection title="Service terms">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Questions about plans or terms?" description="Talk to us so setup details can be confirmed before paid billing begins." />
    </>
  );
}
