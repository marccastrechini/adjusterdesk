import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Cookies | AdjusterDesk",
  description: "Plain-language cookie information for AdjusterDesk, including Google Analytics 4 cookies when a measurement ID is set.",
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
      "When NEXT_PUBLIC_GA_MEASUREMENT_ID is set, the site loads Google Analytics 4 through the gtag script for acquisition and product analytics. The live measurement ID is G-QM2L44CMB2. If the measurement ID is not set, that script does not load and these analytics cookies are not set by AdjusterDesk.",
      "Google Analytics may set first-party cookies in the _ga and _gid style, including a measurement cookie such as _ga_QM2L44CMB2. They help measure visits and in-product actions such as trial, pricing, signup, login, and demo clicks. They are not used for ads or retargeting.",
      "There is currently no cookie-consent UI before that script loads. Analytics cookies can be set on the first page view whenever the measurement ID is configured. Counsel may require a consent choice before non-essential analytics cookies for visitors in some jurisdictions. This page does not claim the current load-on-visit setup satisfies those rules.",
    ],
  },
  {
    title: "Marketing cookies",
    paragraphs: [
      "AdjusterDesk does not use advertising pixels, retargeting cookies, or other marketing cookies on the public website. Google Analytics 4, when enabled, is product and acquisition measurement only.",
    ],
  },
  {
    title: "Managing cookies",
    paragraphs: [
      "You can block or delete cookies in your browser. Blocking strictly necessary session cookies may prevent sign-in or workspace access. Blocking _ga and _gid style cookies limits Google Analytics measurement and does not turn off the rest of the workspace.",
      "Because analytics can load without a consent banner, read this page together with the privacy page. Questions can go to hello@adjusterdesk.xyz.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Cookies"
        title="How AdjusterDesk uses cookies."
        description="Session cookies keep you signed in. Google Analytics 4 cookies can load for acquisition and product measurement when a measurement ID is set. There is no ads or retargeting cookie."
      />
      <PublicSection title="Cookie details">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand
        title="Analytics can load before any consent choice."
        description="Google Analytics 4 runs when a measurement ID is set, with no cookie-consent UI today. There is no advertising or retargeting pixel. Cookie questions go to hello@adjusterdesk.xyz."
      />
    </>
  );
}
