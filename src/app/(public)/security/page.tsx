import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Security | AdjusterDesk",
  description: "Honest security and trust practices for AdjusterDesk.",
  path: "/security",
});

const sections: TrustSection[] = [
  {
    title: "Production access",
    paragraphs: [
      "AdjusterDesk is intended to run over HTTPS in production. Signed-in workspace access uses protected login and server-side session checks before private office pages load.",
    ],
  },
  {
    title: "Workspace separation",
    paragraphs: [
      "Authenticated app routes require a valid workspace. Records are scoped by firm where practical so one office works inside its own claim, client, document, task, money, and report data.",
    ],
  },
  {
    title: "Session and administrative safety practices",
    items: [
      "Signed session cookies are HTTP-only and same-site lax, with secure cookies in production.",
      "System-admin workspace switching uses a separate workspace override cookie.",
      "Production hardening includes administrative maintenance and data-management safeguards.",
      "Uploaded-file handling includes filename cleanup, size checks, path checks, and blocked executable-like extensions.",
    ],
  },
  {
    title: "What AdjusterDesk does not claim",
    paragraphs: [
      "AdjusterDesk does not claim SOC 2, HIPAA compliance, bank-grade security, end-to-end encryption, formal penetration testing, or security certification on this public site. Those claims should only be added after the work is completed and reviewed.",
    ],
  },
  {
    title: "Security contact",
    paragraphs: [
      "Security questions or responsible disclosure notes can be sent to hello@adjusterdesk.xyz with Security in the subject line.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Security"
        title="Practical security notes for AdjusterDesk."
        description="A clear summary of current safeguards without claiming certifications that are not in place."
      />
      <PublicSection title="Security baseline">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Have a security question?" description="Email hello@adjusterdesk.xyz with Security in the subject line so the concern can be reviewed." />
    </>
  );
}
