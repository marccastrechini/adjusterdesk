import Link from "next/link";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Help | ${brandName}`,
  description: `Plain answers about ${brandName} for solo and small public adjusting offices.`,
  path: "/help",
});

const faqs = [
  {
    question: `What is ${brandName}?`,
    answer:
      `${brandName} is a simple workspace for public adjusting offices to track claims, follow-ups, documents, settlements, checks, fees, and invoices in one place.`,
  },
  {
    question: `Who is ${brandName} for?`,
    answer:
      "It is built for solo public adjusters and small offices with up to about five team members who want to move beyond spreadsheets and scattered notes.",
  },
  {
    question: "Is this for public adjusters or insurance company adjusters?",
    answer:
      `${brandName} is designed for public adjusting offices working on behalf of policyholders.`,
  },
  {
    question: `Does ${brandName} replace Xactimate?`,
    answer:
      `No. ${brandName} does not replace estimating software. It helps your office organize claim operations, communication, deadlines, and money tracking around the claim.`,
  },
  {
    question: `Does ${brandName} replace QuickBooks?`,
    answer:
      `No. ${brandName} helps you track claim-level fee and invoice status, but it is not a full accounting replacement.`,
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
    question: "Can clients pay their fee invoices online?",
    answer:
      `Yes. Connect your office's own Stripe account in Client Payments settings, then send the client a secure payment link for the fee invoice. Stripe's standard fees apply, and ${brandName} takes no cut. Clients can pay by card or bank transfer (ACH) through the office's Stripe account. On Stripe's standard pricing, bank payments cost at most $5 per payment, versus about 2.9% + 30¢ for cards.`,
  },
  {
    question: "Do I have to switch payment processors?",
    answer:
      "We integrate with Stripe today. Already use QuickBooks Payments or another processor? Tell us, and we'll work with you on connecting it. You can also keep collecting fees the way you do now and just record the payments on the claim.",
  },
  {
    question: "Can I get my data out?",
    answer:
      `Yes. Your office's data is yours. You can download your leads, claims, and invoices as CSV files from those pages at any time. For a full export of your workspace, including documents, email ${supportEmail} and we'll provide it.`,
  },
  {
    question: "Can clients upload documents?",
    answer:
      "You can track requested and received documents in the claim file. Keep using your current document collection process while your office workflow is being set up.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "Stripe Checkout collects a card at signup. Standard price: $0 during a 14-day trial, then Solo $49/month, Small Office $99/month, or Team $199/month. Founding price for the first 10 offices: $0 for 90 days, then $29/month Solo or $49/month Small Office for 12 months, then the standard price.",
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
        description={`Straight answers to help you decide if ${brandName} fits your office and what to do first after signup.`}
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
        description={`Walk through Today, a lead turning into a claim, and follow-ups on an active claim. Questions go to ${supportEmail}.`}
        primaryHref="/training"
        primaryLabel="Open the training"
        trackPrimaryClick={false}
      />
    </>
  );
}
