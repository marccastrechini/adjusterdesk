import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { NotAttorneyReviewedBanner, TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Privacy Policy | ${brandName}`,
  description: `Privacy policy for ${brandName} public pages and workspaces, including Google Analytics 4 on paclaimboard.com, Stripe billing, and client card or ACH payments.`,
  path: "/privacy",
});

const sections: TrustSection[] = [
  {
    title: "Who this page is from",
    paragraphs: [
      `${brandName}, Massachusetts. A registered legal entity name is not published on this page, and no street or mailing address is published here. A full lawyer-reviewed agreement is not in place yet, so this page does not set a formal governing-law term. Privacy questions go to ${supportEmail}.`,
      "This page is not a CCPA, GDPR, UK GDPR, HIPAA, or SOC 2 notice, and it is not a certification under any of those frameworks.",
    ],
  },
  {
    title: "Information from workspace setup, demo, and contact requests",
    paragraphs: [
      `When someone creates a workspace setup request, asks for a demo, or asks for help, ${brandName} may collect basic contact details such as name, office name, email address, current setup, and the general number of open claims. We use that information to respond, schedule a walkthrough, and confirm practical setup details.`,
    ],
  },
  {
    title: "Account and workspace information",
    paragraphs: [
      `For signed-in workspaces, ${brandName} stores account details needed to provide the service, such as user name, email, role, firm, sign-in status, and workspace settings. This information helps keep each office workspace separate and usable by the right people.`,
    ],
  },
  {
    title: "Claim, client, and business information",
    paragraphs: [
      `Users may enter client names, contact details, property information, claim details, carrier information, documents, notes, follow-ups, deadlines, settlement details, fees, invoices, and payment notes. The customer office owns that claim, client, document, and business information. ${brandName} uses it to provide the workspace features the office chooses to use. ${brandName} does not claim ownership of it.`,
    ],
  },
  {
    title: "How information is used",
    items: [
      `Provide and maintain the ${brandName} workspace.`,
      "Respond to workspace setup, demo, support, billing, export, and account requests.",
      "Measure acquisition and product use with Google Analytics 4 when a measurement ID is configured, as described below.",
      "Help troubleshoot issues and improve the product for small public adjusting offices.",
      "Protect the service, prevent misuse, and keep demo and production work separated.",
      "Process subscription payments through Stripe, and client invoice payments through Stripe when an office turns on client payments.",
    ],
  },
  {
    title: "Google Analytics 4",
    paragraphs: [
      `When the site is configured with a Google Analytics 4 measurement ID (the environment variable NEXT_PUBLIC_GA_MEASUREMENT_ID) and the browser host is paclaimboard.com or www.paclaimboard.com, ${brandName} loads Google’s gtag script from googletagmanager.com and sends analytics. The live site uses measurement ID G-QM2L44CMB2. The script does not load on a sandbox host. If that variable is unset, the script does not load.`,
      `We use Google Analytics for acquisition and product analytics: which public pages people open, and product actions such as trial_start_click, sign_up, trial_created, first_claim_created, claim_tracker_download, and purchase. It is not used for ads, remarketing, or retargeting. Those events do not include email addresses or names. ${brandName} does not run advertising pixels.`,
      `Google may set first-party cookies in the _ga and _gid style, including a measurement cookie such as _ga_QM2L44CMB2. Those cookies can include a client identifier. Google may also receive the page address, approximate location, and device or browser details that come with a normal analytics hit, plus the event names ${brandName} sends.`,
      "There is currently no cookie-consent banner or other consent UI before Google Analytics loads. The script can run on the first page view whenever the measurement ID is set. Counsel may require consent before non-essential analytics cookies for visitors in some jurisdictions. This page does not claim that loading analytics before a consent choice meets those rules.",
    ],
  },
  {
    title: "Service providers",
    paragraphs: [
      `${brandName} relies on service providers to run the product. Stripe is the payment processor for Checkout and subscription billing. When an office turns on client payments, its clients' fee invoice payments are processed by Stripe on that office's own connected Stripe account. ${brandName} does not store card numbers; it stores the invoice and the payment status Stripe reports back. Other providers may handle hosting, database or file storage, email delivery, and error logging. Google provides Google Analytics 4 when the measurement ID above is set.`,
      "The public site does not use advertising pixels or retargeting scripts. The cookie page describes the cookies those providers can set.",
    ],
  },
  {
    title: "Billing information",
    paragraphs: [
      `Signup uses Stripe Checkout and collects a card. Published plan and trial terms stay the ones already on the pricing and founding pages: standard Solo $49/month, Small Office $99/month, and Team $199/month, with $0 due during a 14-day trial and then the plan price; founding Solo and Small Office, for the first 10 offices, with $0 during a 90-day trial and then $29/month or $49/month for 12 months, then the standard price. Stripe receives the payment details and billing identifiers needed to charge that subscription. ${brandName} stores the plan, subscription status, and Stripe customer and subscription identifiers needed to show billing status in the workspace.`,
    ],
  },
  {
    title: "Retention and customer ownership",
    paragraphs: [
      `Customer offices own the claim, client, document, and business information they enter. ${brandName} keeps information while it is needed to provide the service, support the account, meet ordinary business and backup needs, or resolve a billing or security question. This page does not set a fixed deletion calendar.`,
      `Your office's data is yours. Signed-in users can download leads, claims, and invoices as CSV files from those pages at any time. For a full export of the workspace, including documents, email ${supportEmail} and we will provide it. Deletion and other privacy-rights requests go to the same address, and we will handle the request for that workspace. Canceling a subscription does not by itself delete claim records.`,
    ],
  },
  {
    title: "Contact and privacy requests",
    paragraphs: [
      `Questions or privacy-rights requests can be sent to ${supportEmail}. We try to reply within a few business days. You can also use the contact page. This page is practical product guidance, not attorney-reviewed, and not a certification of compliance with CCPA, GDPR, HIPAA, SOC 2, or any other formal framework.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <NotAttorneyReviewedBanner />
      <PublicPageHeader
        eyebrow="Privacy"
        title={`Privacy policy for ${brandName}`}
        description={`A practical summary of the information ${brandName} may collect, including Google Analytics 4 when it is turned on, and how that information is used to provide the service.`}
      />
      <PublicSection title="Privacy basics">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Have a privacy question?" description={`Email ${supportEmail} or use the contact page. We try to reply within a few business days.`} />
    </>
  );
}
