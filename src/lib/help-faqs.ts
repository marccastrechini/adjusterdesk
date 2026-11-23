import { brandName, supportEmail } from "@/lib/brand";

export type HelpFaq = {
  question: string;
  answer: string;
};

/** Visible help-page answers. FAQ structured data is built from this same list. */
export const helpFaqs: HelpFaq[] = [
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
