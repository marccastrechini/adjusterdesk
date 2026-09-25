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
      "Yes. After you start the desk, you can import a cleaned spreadsheet. A claim tracker sheet is available if you want a file first.",
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
      "Stripe Checkout collects a card at signup. $0 is due during the 14-day trial. The standard plan price begins when that trial ends, unless a founding rate is applied. First 10 founding offices: $0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months. That longer $0 period and the $29/$49 lock are applied after you start.",
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
          <PublicButtonLink href="/founding-public-adjuster-offices" variant="primary" eventName="trial_start_click">
            See founding desk offer
          </PublicButtonLink>
          <PublicButtonLink href="/signup" variant="secondary" eventName="trial_start_click">
            Start free trial
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
        <p className="mt-4 text-sm leading-6 text-slate-600">
          <Link href="/free-public-adjuster-claim-tracker" className="font-medium text-teal-800 hover:text-teal-900">
            Prefer a sheet for now?
          </Link>
        </p>
      </PublicSection>

      <CtaBand
        title="Need a practical walkthrough for your office?"
        description="Start with your first 10 active claims. Email hello@adjusterdesk.xyz if you want the founding rate confirmed."
        primaryHref="/founding-public-adjuster-offices"
        primaryLabel="See founding desk offer"
      />
    </>
  );
}
