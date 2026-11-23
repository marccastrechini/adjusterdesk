import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { CtaBand, PublicButtonLink, PublicPageHeader, PublicSection } from "@/components/public-site";
import { helpFaqs } from "@/lib/help-faqs";
import { publicPageMetadata } from "@/lib/public-metadata";
import { faqPageJsonLd } from "@/lib/structured-data";
import { brandName, supportEmail } from "@/lib/brand";

export const metadata = publicPageMetadata({
  title: `Public Adjuster CRM Help and FAQ | ${brandName}`,
  description: `FAQ for this public adjuster CRM: who it is for, the free trial, Stripe card and ACH client payments, spreadsheet import, and what it does not replace.`,
  path: "/help",
});

export default function HelpPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(helpFaqs)} />
      <PublicPageHeader
        eyebrow="Help"
        title="Public adjuster CRM help and FAQ"
        description={`Straight answers to help you decide if ${brandName} fits your office and what to do first after signup.`}
      />

      <PublicSection title="Frequently asked questions" tone="white">
        <div className="grid gap-3">
          {helpFaqs.map((item) => (
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
