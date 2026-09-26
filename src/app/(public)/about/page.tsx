import Link from "next/link";
import { PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "About | AdjusterDesk",
  description: "AdjusterDesk is an early company building a workspace for small public adjusting offices.",
  path: "/about",
});

const sections: TrustSection[] = [
  {
    title: "An early company",
    paragraphs: [
      "AdjusterDesk is an early company. It is a workspace for solo and small public adjusting offices: claims, clients, documents, follow-ups, settlements, fees, and invoices in one place.",
      "The legal entity name and mailing address are not published on this page yet. They will be added when they are confirmed.",
    ],
  },
  {
    title: "Who you will hear from",
    paragraphs: [
      "Marc works on the product. Jenn works with customers.",
      "Those are first names only.",
    ],
  },
  {
    title: "What the product is, and is not",
    paragraphs: [
      "AdjusterDesk helps a small office keep claim work from living only in email, memory, and scattered files. It does not replace estimating software or a full accounting system.",
      "It is not legal advice, estimating advice, coverage advice, or a substitute for a public adjuster’s own judgment.",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="About"
        title="A desk for small public adjusting offices."
        description="AdjusterDesk is early. Marc builds the product. Jenn works with customers. The legal entity and mailing address will be added when they are confirmed."
      />
      <PublicSection title="About AdjusterDesk">
        <TrustPageContent sections={sections} />
        <p className="mt-6 text-sm leading-6 text-slate-700">
          <Link href="/contact" className="font-medium text-teal-800 hover:text-teal-900">
            Contact
          </Link>
          {" · "}
          <Link href="/demo" className="font-medium text-teal-800 hover:text-teal-900">
            Request a demo
          </Link>
          {" · "}
          <Link href="/help" className="font-medium text-teal-800 hover:text-teal-900">
            Help
          </Link>
        </p>
      </PublicSection>
    </>
  );
}
