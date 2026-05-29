import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Cookies | AdjusterDesk",
  description: "Plain-language cookie information for AdjusterDesk.",
  path: "/cookies",
});

const sections: TrustSection[] = [
  {
    title: "Strictly necessary cookies",
    paragraphs: [
      "AdjusterDesk uses strictly necessary cookies for signed-in app access. The current session cookie is used to keep a user signed in, and an admin workspace override cookie may be used for system-admin workspace review. These cookies are HTTP-only, same-site lax, and configured as secure in production.",
    ],
  },
  {
    title: "Preference cookies",
    paragraphs: [
      "The public website does not currently set preference cookies. If user-controlled preferences are added later, this page should describe what is stored and why.",
    ],
  },
  {
    title: "Analytics cookies",
    paragraphs: [
      "The public website does not currently include analytics cookies or analytics scripts. No analytics cookies are set before consent because no analytics tracking is active in this slice.",
    ],
  },
  {
    title: "Marketing cookies",
    paragraphs: [
      "AdjusterDesk does not currently use advertising pixels, retargeting cookies, or marketing cookies on the public website.",
    ],
  },
  {
    title: "Managing cookies",
    paragraphs: [
      "Because the current public site only uses strictly necessary signed-in app cookies, there is no cookie banner. You can manage cookies through your browser settings. Blocking necessary cookies may prevent sign-in or workspace access from working.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Cookies"
        title="How AdjusterDesk uses cookies."
        description="A simple explanation of the cookies currently used for sign-in and workspace access."
      />
      <PublicSection title="Cookie details">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="No marketing tracking is active on the public site." description="If non-essential analytics or marketing cookies are added later, AdjusterDesk should add a clear consent choice before they run." />
    </>
  );
}
