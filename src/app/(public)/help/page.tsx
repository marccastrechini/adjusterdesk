import Link from "next/link";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";

export const metadata = publicPageMetadata({
  title: "Help | AdjusterDesk",
  description: "Plain answers about AdjusterDesk for solo and small public adjusting offices.",
  path: "/help",
});

const faqs = [
  {
    question: "What is AdjusterDesk?",
    answer:
      "AdjusterDesk is a simple workspace for public adjusting offices to track claims, follow-ups, documents, settlements, checks, fees, and invoices in one place.",
  },
  {
    question: "Who is AdjusterDesk for?",
    answer:
      "It is built for solo public adjusters and small offices with up to about five team members who want to move beyond spreadsheets and scattered notes.",
  },
  {
    question: "Is this for public adjusters or insurance company adjusters?",
    answer:
      "AdjusterDesk is designed for public adjusting offices working on behalf of policyholders.",
  },
  {
    question: "Does AdjusterDesk replace Xactimate?",
    answer:
      "No. AdjusterDesk does not replace estimating software. It helps your office organize claim operations, communication, deadlines, and money tracking around the claim.",
  },
  {
    question: "Does AdjusterDesk replace QuickBooks?",
    answer:
      "No. AdjusterDesk helps you track claim-level fee and invoice status, but it is not a full accounting replacement.",
  },
  {
    question: "Can I start from a spreadsheet?",
    answer:
      "Yes. Many offices start with the free claim tracker or a cleaned spreadsheet, then move active claim work into AdjusterDesk.",
  },
  {
    question: "Can I track settlements, fees, and invoices?",
    answer:
      "Yes. You can record settlement rounds, track fee amounts, and monitor invoice and payment status by claim.",
  },
  {
    question: "Can clients upload documents?",
    answer:
      "You can track requested and received documents in the claim file. Keep using your current document collection process while your office workflow is being set up.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "Your workspace starts with a 14-day free trial. No credit card is required to begin. You can choose a paid plan from Billing when you are ready.",
  },
  {
    question: "What should I do first after signing up?",
    answer:
      "Start on the Start Here page: add your first claim, set a follow-up task, add key documents, and review users and billing settings.",
  },
];

export default function HelpPage() {
  return (
    <>
      <PublicPageHeader
        eyebrow="Help"
        title="Common questions from small public adjusting offices"
        description="Straight answers to help you decide if AdjusterDesk fits your office and what to do first after signup."
      />

      <PublicSection title="Frequently asked questions" tone="white">
        <div className="grid gap-3">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">{item.question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{item.answer}</p>
            </article>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Quick next steps" tone="slate">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PublicButtonLink href="/signup" variant="primary" eventName="trial_start_click">
            Start free trial
          </PublicButtonLink>
          <PublicButtonLink href="/free-public-adjuster-claim-tracker" variant="secondary">
            Download free claim tracker
          </PublicButtonLink>
          <PublicButtonLink href="/public-adjuster-software" variant="secondary">
            Public adjuster software page
          </PublicButtonLink>
          <Link
            href="/pricing"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Pricing
          </Link>
        </div>
      </PublicSection>

      <CtaBand
        title="Need a practical walkthrough for your office?"
        description="Start your trial or review the free tracker first, then move your active claims into one shared workspace."
      />
    </>
  );
}
