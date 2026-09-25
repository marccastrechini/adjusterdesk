import Link from "next/link";
import { PublicButtonLink } from "@/components/public-site";
import {
  FOUNDING_HONESTY_NOTE,
  FOUNDING_PAGE_HREF,
  FOUNDING_SMALL_OFFICE_SIGNUP_HREF,
  FOUNDING_SOLO_SIGNUP_HREF,
  FOUNDING_TERMS,
  TRACKER_PAGE_HREF,
} from "@/lib/founding-offer";

export function FoundingOfferSummary({
  heading = "First 10 founding offices",
  headingLevel = "h2",
  showPageLink = false,
}: {
  heading?: string;
  headingLevel?: "h2" | "h3";
  showPageLink?: boolean;
}) {
  const HeadingTag = headingLevel;

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-6">
      <HeadingTag className="text-base font-semibold text-slate-950">{heading}</HeadingTag>
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
        {FOUNDING_TERMS.map((term) => (
          <li key={term} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-teal-700" />
            <span>{term}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-6 text-slate-700">{FOUNDING_HONESTY_NOTE}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <PublicButtonLink href={FOUNDING_SOLO_SIGNUP_HREF} variant="primary" eventName="trial_start_click">
          Start Solo founding desk
        </PublicButtonLink>
        <PublicButtonLink href={FOUNDING_SMALL_OFFICE_SIGNUP_HREF} variant="secondary" eventName="trial_start_click">
          Start Small Office
        </PublicButtonLink>
        {showPageLink ? (
          <PublicButtonLink href={FOUNDING_PAGE_HREF} variant="secondary">
            Read founding terms
          </PublicButtonLink>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        <Link href={TRACKER_PAGE_HREF} className="font-medium text-teal-800 hover:text-teal-900">
          Prefer a sheet for now?
        </Link>
      </p>
    </div>
  );
}
