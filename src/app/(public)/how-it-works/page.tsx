import type { Metadata } from "next";
import { CheckList, CtaBand, PublicPageHeader, PublicSection, StepList } from "@/components/public-site";

export const metadata: Metadata = {
  title: "How It Works | AdjusterDesk",
  description: "A plain-language workflow for small public adjusting offices using AdjusterDesk.",
};

const steps = [
  {
    title: "Bring over the basics",
    description: "Start with current leads and claims from your spreadsheet or manual list. Add the client, property, carrier, claim number, dates, and next step.",
  },
  {
    title: "Keep the claim file together",
    description: "Use the claim page for documents, photos, notes, requests, calls, texts, emails, deadlines, settlement offers, and payments.",
  },
  {
    title: "Work follow-ups before they slip",
    description: "Use tasks and due dates to keep up with client calls, carrier follow-ups, missing documents, inspections, and claim deadlines.",
  },
  {
    title: "Track the money",
    description: "Record settlement rounds, checks, fee invoices, payments, and balances so unpaid money does not hide in a note or email thread.",
  },
  {
    title: "Start each day from Today",
    description: "Review overdue work, due dates, missing client documents, carrier follow-ups, and receivables from one practical morning view.",
  },
];

const checklistItems = [
  "Works for one adjuster handling files alone.",
  "Works for a small office where several people need the same claim picture.",
  "Uses plain claim, client, carrier, document, deadline, payment, fee, and invoice language.",
  "Keeps public marketing pages separate from the signed-in office workspace.",
];

export default function HowItWorksPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="How it works"
        title="Simple steps from scattered claim work to a shared office view."
        description="AdjusterDesk is meant to fit into the daily rhythm of a small public adjusting office, not replace the judgment of the adjuster."
      />
      <PublicSection title="The office flow">
        <StepList steps={steps} />
      </PublicSection>
      <PublicSection title="What stays simple" tone="slate">
        <CheckList items={checklistItems} />
      </PublicSection>
      <CtaBand title="Walk through the workflow with your current setup in mind." description="Request a demo and compare AdjusterDesk to the spreadsheets, folders, reminders, and accounting notes your office uses now." />
    </>
  );
}