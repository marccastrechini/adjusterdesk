import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { NotAttorneyReviewedBanner, TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Terms | AdjusterDesk",
  description: "Plain-language terms for using AdjusterDesk, including trial, paid billing, cancellation, and customer data.",
  path: "/terms",
});

const sections: TrustSection[] = [
  {
    title: "Who you are dealing with",
    paragraphs: [
      "AdjusterDesk is an early company. The legal entity name and mailing address are not published on this page yet. Governing law for a customer agreement is not chosen yet (TBD). Those details will be added after they are confirmed. Until then, questions about these terms go to hello@adjusterdesk.xyz.",
      "A lawyer has not reviewed this page. It is a practical summary so an office can see how signup, billing, data, and product limits work today. It is not the finished customer agreement.",
    ],
  },
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
      "The customer office owns the claim, client, document, and other business records it enters into AdjusterDesk. AdjusterDesk does not claim ownership of that content. AdjusterDesk uses it to provide the workspace, support the account, and keep the service reliable.",
      "Export and deletion are not fully self-serve yet. While those tools are still growing, email hello@adjusterdesk.xyz to ask for an export or deletion of workspace data. We keep information while it is needed to provide the service, support the account, keep ordinary backups, or handle a billing or security question. This page does not set a fixed retention calendar. Canceling a subscription does not by itself delete claim records.",
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
      "Public pricing is Solo $49/month, Small Office $99/month, and Team $199/month. Signup uses Stripe Checkout and collects a card. On that path, $0 is due during the 14-day trial, then the plan price. Founding Solo and Small Office Checkout charges $0 during a 90-day trial, then $29/month or $49/month, locked for 12 months for the first 10 offices.",
      "Stripe is the payment processor. AdjusterDesk does not store full card numbers. Stripe receives the card and the billing details needed to run Checkout and the subscription. The workspace stores plan, status, and Stripe customer and subscription identifiers so billing status can be shown in the product.",
      "When a trial ends, Stripe bills the plan price for that subscription unless the office cancels first. Leaving Checkout before it finishes does not start a paid subscription. The 12-month founding price is a commercial promise to those first 10 offices. It is not described here as an automatic Stripe price change.",
      "When the Stripe billing portal is available from Billing settings, use it to manage the subscription, including cancellation if that portal offers the control. If the portal is not available for the workspace, email hello@adjusterdesk.xyz and ask to cancel. This page does not promise refunds, credits, or a notice period beyond what Stripe shows for that subscription.",
    ],
  },
  {
    title: "Professional judgment and advice",
    paragraphs: [
      "AdjusterDesk is not legal advice, estimating advice, coverage advice, claim valuation advice, or a replacement for professional public-adjuster judgment. Offices remain responsible for their claim handling decisions, client communications, estimates, coverage positions, invoices, and business records.",
    ],
  },
  {
    title: "Availability and liability",
    paragraphs: [
      "AdjusterDesk aims to provide a reliable workspace, but the service can be interrupted, can fail, and can contain mistakes. It is offered as a software workspace for organizing office work. It is not a law firm, an estimating service, or an insurer, and it is not responsible for claim outcomes.",
      "A specific dollar cap, indemnity, warranty, and formal dispute process are not set on this page. They belong in a lawyer-reviewed customer agreement, which does not exist here yet. Governing law for that agreement is still TBD. Until that agreement is in place, billing and service questions go to hello@adjusterdesk.xyz.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <NotAttorneyReviewedBanner />
      <PublicPageHeader
        eyebrow="Terms"
        title="Plain terms for using AdjusterDesk."
        description="A practical summary of service use, trial and paid billing through Stripe, cancellation, customer data, and product limits. A lawyer has not reviewed this page."
      />
      <PublicSection title="Service terms">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Questions about plans or terms?" description="Email hello@adjusterdesk.xyz before or after signup. We try to reply within a few business days." />
    </>
  );
}
