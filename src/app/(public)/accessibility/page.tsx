import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Accessibility | AdjusterDesk",
  description: "Accessibility commitment and contact information for AdjusterDesk.",
  path: "/accessibility",
});

const sections: TrustSection[] = [
  {
    title: "Accessibility commitment",
    paragraphs: [
      "AdjusterDesk is built for busy small offices, including people who need clear text, predictable navigation, keyboard access, and practical screen-reader structure. The goal is a straightforward workspace that does not require technical confidence to use.",
    ],
  },
  {
    title: "Current public-site practices",
    items: [
      "Semantic headings and page landmarks on public pages.",
      "Meaningful link text for navigation, trial access, demo requests, and login.",
      "Visible focus states on links and buttons.",
      "Responsive layouts that avoid horizontal overflow on small screens.",
      "Buttons and calls to action implemented as real links or buttons, not inaccessible divs.",
    ],
  },
  {
    title: "Ongoing work",
    paragraphs: [
      "Accessibility review is an ongoing part of AdjusterDesk hardening. As the app grows, forms, tables, imports, document workflows, and reports should continue to be tested with keyboard navigation, screen-reader structure, clear labels, and color contrast in mind.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "If you have trouble using AdjusterDesk or notice an accessibility issue, email hello@adjusterdesk.xyz with the page, browser, device, and a short description of the problem. This page is a practical commitment, not a formal accessibility certification.",
    ],
  },
];

export default function AccessibilityPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Accessibility"
        title="A practical commitment to accessible public pages."
        description="AdjusterDesk should be clear, keyboard-friendly, and usable for low-tech solo and small-office teams."
      />
      <PublicSection title="Accessibility baseline">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Need help using a page?" description="Send the page link and a short note to hello@adjusterdesk.xyz so the issue can be reviewed." />
    </>
  );
}
