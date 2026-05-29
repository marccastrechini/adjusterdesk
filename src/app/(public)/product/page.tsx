import { CtaBand, PublicPageHeader, PublicSection, StepList, WorkspacePreview } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Product | AdjusterDesk",
  description: "See how AdjusterDesk supports the daily claim workflow for small public adjusting offices.",
  path: "/product",
});

const workflowSteps = [
  {
    title: "Lead and client intake",
    description: "Enter the client, property, loss type, contact details, source, and first follow-up date when someone reaches out.",
  },
  {
    title: "Claim setup",
    description: "Create the claim file with carrier, policy, claim number, date of loss, deadline date, status, and assigned office user.",
  },
  {
    title: "Documents and notes",
    description: "Keep document requests, uploaded file notes, call logs, emails, text notes, meetings, and inspections tied to the claim.",
  },
  {
    title: "Follow-ups and deadlines",
    description: "Track open tasks, due dates, missing items, carrier follow-ups, and claim deadlines before they turn into emergencies.",
  },
  {
    title: "Carrier offer",
    description: "Record demand amounts, carrier offers, accepted amounts, dates, and notes as settlement discussions move forward.",
  },
  {
    title: "Settlement payment",
    description: "Track checks, partial payments, payees, payment dates, and notes so money movement is visible from the claim.",
  },
  {
    title: "Fee and invoice tracking",
    description: "Create fee invoices, record fee percentage, see balances due, and keep unpaid receivables in view.",
  },
  {
    title: "Today view",
    description: "Start the morning with a plain worklist for overdue tasks, due dates, missing client documents, carrier follow-ups, and money still open.",
  },
];

export default function ProductPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Product"
        title="A daily operating workspace for public adjusting offices."
        description="AdjusterDesk follows the way a small office works: intake, claim setup, documents, follow-ups, carrier offers, settlement payments, fees, invoices, and the Today view."
      />
      <PublicSection title="The workflow from lead to Today">
        <StepList steps={workflowSteps} />
      </PublicSection>
      <PublicSection title="What the office sees each morning" description="Today brings open work into one view, so the next call, deadline, missing document, or unpaid invoice is easier to spot." tone="slate">
        <WorkspacePreview />
      </PublicSection>
      <CtaBand title="See the product with a real small-office workflow." description="Request a short demo focused on your office's current spreadsheets, document folders, follow-up habits, and fee tracking." />
    </>
  );
}