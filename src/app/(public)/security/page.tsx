import { CtaBand, PublicPageHeader, PublicSection } from "@/components/public-site";
import { TrustPageContent, type TrustSection } from "@/components/trust-page";
import { publicPageMetadata } from "@/lib/public-metadata";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Security | ${brandName}`,
  description: `Honest security and trust practices for ${brandName}.`,
  path: "/security",
});

const sections: TrustSection[] = [
  {
    title: "Production access",
    paragraphs: [
      `${brandName} is intended to run over HTTPS in production. Signed-in workspace access uses protected login and server-side session checks before private office pages load.`,
    ],
  },
  {
    title: "Workspace separation",
    paragraphs: [
      "Every claim, client, document, task, money, and report record belongs to one office, and the app only shows an office its own records. Each signed-in page, document download, and CSV export checks the user's office before it loads or changes a record.",
      `A client status link shows only that one claim's status to the person the office sends it to. ${brandName} system admins can open an office's workspace to give support.`,
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
    title: `What ${brandName} does not claim`,
    paragraphs: [
      `${brandName} does not claim SOC 2, HIPAA compliance, bank-grade security, end-to-end encryption, formal penetration testing, or security certification on this public site. Those claims should only be added after the work is completed and reviewed.`,
    ],
  },
  {
    title: "Security contact",
    paragraphs: [
      `Security questions or responsible disclosure notes can be sent to ${supportEmail} with Security in the subject line.`,
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Security"
        title={`Practical security notes for ${brandName}.`}
        description="A clear summary of current safeguards without claiming certifications that are not in place."
      />
      <PublicSection title="Security baseline">
        <TrustPageContent sections={sections} />
      </PublicSection>
      <CtaBand title="Have a security question?" description={`Email ${supportEmail} with Security in the subject line so the concern can be reviewed.`} />
    </>
  );
}
