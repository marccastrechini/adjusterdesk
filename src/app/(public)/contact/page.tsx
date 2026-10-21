import Link from "next/link";
import { PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Contact | ${brandName}`,
  description: `Email ${supportEmail} for setup, billing, privacy, and product questions.`,
  path: "/contact",
});

const sections: TrustSection[] = [
  {
    title: "Email",
    paragraphs: [
      `Write to ${supportEmail}. Use it for setup questions, a demo request, billing, cancellation help, privacy requests, exports, and security notes.`,
      "We try to reply within a few business days.",
      "This is not a same-day support promise, a 24-hour desk, or an emergency line for an active claim.",
    ],
  },
  {
    title: "What helps us answer",
    items: [
      "Your name and office name.",
      "The workspace email, if you already have an account.",
      "Whether the note is about setup, billing, privacy, or a product issue.",
      "A short description of what you need.",
    ],
  },
  {
    title: "Demo and help",
    paragraphs: [
      `For a walkthrough, use the demo page and send the same ${supportEmail} address. Common product questions are on the help page. Privacy and cookie details are on their own pages.`,
    ],
  },
];

export default function ContactPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Contact"
        title={`Email ${supportEmail}.`}
        description="We try to reply within a few business days. Include your office name and what you need so the note can be answered directly."
      />
      <PublicSection title={`How to reach ${brandName}`}>
        <TrustPageContent sections={sections} />
        <p className="mt-6 text-sm leading-6 text-slate-700">
          <a href={`mailto:${supportEmail}`} className="font-medium text-teal-800 hover:text-teal-900">
            {supportEmail}
          </a>
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
