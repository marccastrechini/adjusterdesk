import Link from "next/link";
import { FoundingOfferSummary } from "@/components/founding-offer-summary";
import { ProductOverviewVideo } from "@/components/product-overview-video";
import { CtaBand, PublicButtonLink, PublicSection } from "@/components/public-site";
import {
  FOUNDING_HONESTY_NOTE,
  FOUNDING_ONBOARDING,
  FOUNDING_PRICE_LINE,
  FOUNDING_SMALL_OFFICE_SIGNUP_HREF,
  FOUNDING_SOLO_SIGNUP_HREF,
  FOUNDING_STANDARD_COMPARE,
  FOUNDING_SUPPORT_EMAIL,
  TRACKER_PAGE_HREF,
} from "@/lib/founding-offer";
import { publicPageMetadata } from "@/lib/public-metadata";
import { CheckCircle2 } from "lucide-react";

export const metadata = publicPageMetadata({
  title: "Founding Office Desk | AdjusterDesk",
  description:
    "First 10 founding public adjusting offices: $0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months. A desk for claims, follow-ups, documents, and fees.",
  path: "/founding-public-adjuster-offices",
});

const slippingWork = [
  {
    title: "Follow-ups",
    description: "Carrier calls and client next steps live in memory, a text thread, or a calendar reminder that never gets checked.",
  },
  {
    title: "Documents",
    description: "Photos, estimates, and missing-doc requests sit in email and folders, so the file is never in one place.",
  },
  {
    title: "Fees",
    description: "The settlement is somewhere. The invoice is not. Receivables slip because the money is not next to the claim.",
  },
];

const whoItsFor = [
  {
    title: "Solo adjusters",
    description: "One person running claims from email, memory, and scattered files. The next follow-up is easy to lose.",
  },
  {
    title: "Offices of 2–5 people",
    description: "The owner, a partner, or an assistant cannot see the same claim, document, or next step.",
  },
  {
    title: "Fees that never get billed",
    description: "Settlements get recorded somewhere else. The fee invoice waits until someone remembers it.",
  },
];

const deskIncludes = [
  "One desk for claims, follow-ups, documents, and fees",
  "Your first 10 active claims, with the rest of the book left in place until this is working",
  "Async onboarding. No sales call.",
  "Email support at hello@adjusterdesk.xyz",
  "A say in what the desk should do next",
  FOUNDING_PRICE_LINE,
];

export default function FoundingPublicAdjusterOfficesPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-normal text-teal-800">First 10 founding offices</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            Claims, follow-ups, documents, and fees are slipping.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            In a 1–5 person public adjusting office, that work lives in email, memory, and scattered files. A carrier follow-up waits. A document request stays in a thread. A fee never gets invoiced. AdjusterDesk is the desk for those claims. Start with your first 10 active claims.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PublicButtonLink href={FOUNDING_SOLO_SIGNUP_HREF} variant="primary" eventName="trial_start_click">
              Start Solo founding desk
            </PublicButtonLink>
            <PublicButtonLink href={FOUNDING_SMALL_OFFICE_SIGNUP_HREF} variant="secondary" eventName="trial_start_click">
              Start Small Office
            </PublicButtonLink>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            {FOUNDING_PRICE_LINE} {FOUNDING_STANDARD_COMPARE}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            <Link href={TRACKER_PAGE_HREF} className="font-medium text-teal-800 hover:text-teal-900">
              Prefer a sheet for now?
            </Link>
          </p>
        </div>
      </section>

      <PublicSection title="See the desk in 60 seconds" description="A silent Demo Office walkthrough. Captions are on the screen, and the note under the player covers the same path." tone="slate">
        <ProductOverviewVideo />
      </PublicSection>

      <PublicSection title="Where the work slips" tone="white">
        <div className="grid gap-4 md:grid-cols-3">
          {slippingWork.map(({ title, description }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Founding desk terms" description="Plain dollars for the first 10 offices. Team stays at the standard $199/month." tone="slate">
        <FoundingOfferSummary heading="What the first 10 offices get" headingLevel="h3" />
      </PublicSection>

      <PublicSection title="Who this desk is for" tone="white">
        <div className="grid gap-4 md:grid-cols-3">
          {whoItsFor.map(({ title, description }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="What you get on the desk" description={FOUNDING_ONBOARDING} tone="slate">
        <div className="grid gap-3 sm:grid-cols-2">
          {deskIncludes.map((feature) => (
            <div key={feature} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-teal-700" aria-hidden />
              <p className="text-sm leading-6 text-slate-700">{feature}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection title="Start with your first 10 active claims" description="Keep the rest of the book where it is until the desk is earning its place." tone="white">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Step 1", "Add 10 active claims: client, property, carrier, dates, and the next follow-up."],
            ["Step 2", "Keep documents and client updates on the claim, not in a separate inbox."],
            ["Step 3", "Record the settlement and the fee so the invoice is next to the file."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-slate-600">{FOUNDING_HONESTY_NOTE}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Questions about the seat or your claim volume:{" "}
          <a href={`mailto:${FOUNDING_SUPPORT_EMAIL}`} className="font-medium text-teal-800 hover:text-teal-900">
            {FOUNDING_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </PublicSection>

      <CtaBand
        title="Put the first 10 active claims on the desk."
        description={`${FOUNDING_PRICE_LINE} ${FOUNDING_STANDARD_COMPARE} ${FOUNDING_ONBOARDING}`}
        primaryHref={FOUNDING_SOLO_SIGNUP_HREF}
        primaryLabel="Start Solo founding desk"
      />
    </>
  );
}
