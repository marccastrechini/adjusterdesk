import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Privacy | AdjusterDesk",
  description: "Plain-language privacy information for AdjusterDesk public pages and workspace users.",
  path: "/privacy",
});

const sections: TrustSection[] = [
  {
    title: "Information from workspace setup, demo, and contact requests",
    paragraphs: [
      "When someone creates a workspace setup request, asks for a demo, or asks for help, AdjusterDesk may collect basic contact details such as name, office name, email address, current setup, and the general number of open claims. We use that information to respond, schedule a walkthrough, and confirm practical setup details.",
    ],
  },
  {
    title: "Account and workspace information",
    paragraphs: [
      "For signed-in workspaces, AdjusterDesk stores account details needed to provide the service, such as user name, email, role, firm, sign-in status, and workspace settings. This information helps keep each office workspace separate and usable by the right people.",
    ],
  },
  {
    title: "Claim, client, and business information",
    paragraphs: [
      "Users may enter client names, contact details, property information, claim details, carrier information, documents, notes, follow-ups, deadlines, settlement details, fees, invoices, and payment notes. This information belongs to the customer office and is used to provide the workspace features the office chooses to use.",
    ],
  },
  {
    title: "How information is used",
    items: [
      "Provide and maintain the AdjusterDesk workspace.",
      "Respond to workspace setup, demo, support, and account requests.",
      "Help troubleshoot issues and improve the product for small public adjusting offices.",
      "Protect the service, prevent misuse, and keep demo and production work separated.",
    ],
  },
  {
    title: "Service providers",
    paragraphs: [
      "AdjusterDesk may rely on practical service providers for hosting, database or file storage, email delivery, error logging, and similar operations. The current public site does not include advertising pixels, retargeting scripts, or public marketing analytics. If those tools are added later, this page and the cookie page should be updated before they are used.",
    ],
  },
  {
    title: "Retention and customer ownership",
    paragraphs: [
      "Customer offices own the claim, client, document, and business information they enter. AdjusterDesk keeps information while it is needed to provide the service, support the account, meet practical business needs, or handle backup and safety requirements. Deletion, export, and privacy-rights requests can be sent to the contact email below while formal self-serve tools are still growing.",
    ],
  },
  {
    title: "Contact and privacy requests",
    paragraphs: [
      "Questions or privacy-rights requests can be sent to hello@adjusterdesk.xyz. This page is practical product guidance, not a certification of compliance with CCPA, GDPR, HIPAA, SOC 2, or any other formal framework.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Privacy"
        title="How AdjusterDesk handles information."
        description="A practical summary of the information AdjusterDesk may collect and how it is used to provide the service."
      />
      <PublicSection title="Privacy basics">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Have a privacy question?" description="Send a note through the demo request flow or email hello@adjusterdesk.xyz so the question reaches the right place." />
    </>
  );
}
