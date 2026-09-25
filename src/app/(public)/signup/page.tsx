import Link from "next/link";
import { FieldError } from "@/components/action-form";
import { SignupSubmitTrackingForm } from "@/components/signup-submit-tracking-form";
import { Card, Field, SubmitButton, inputClassName, selectClassName } from "@/components/ui";
import {
  findPublicPlanBySlug,
  listPublicPlans,
  selfServiceSignupEnabled,
} from "@/lib/billing";
import {
  CHECKOUT_CARD_LINE,
  FOUNDING_HONESTY_NOTE,
  FOUNDING_ONBOARDING,
  FOUNDING_PRICE_LINE,
  FOUNDING_STANDARD_COMPARE,
  TRACKER_PAGE_HREF,
  isFoundingOffer,
} from "@/lib/founding-offer";
import { publicPageMetadata } from "@/lib/public-metadata";
import { startSignupWithState } from "@/lib/signup-actions";

export const dynamic = "force-dynamic";

export const metadata = publicPageMetadata({
  title: "Sign Up | AdjusterDesk",
  description: "Create your workspace and choose the plan that fits your office.",
  path: "/signup",
});

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const requestedPlan = firstValue(query.plan);
  const founding = isFoundingOffer(firstValue(query.offer));
  const defaultPlan = findPublicPlanBySlug(requestedPlan) ?? (founding ? listPublicPlans()[0] : listPublicPlans()[1]);

  if (!selfServiceSignupEnabled()) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-teal-800">AdjusterDesk signup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Create your AdjusterDesk workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Self-service signup is not available right now. Contact us to get started.
            </p>
          </div>

          <Card className="grid gap-3">
            <p className="text-sm leading-6 text-slate-700">
              Contact us and we will get your office set up.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="mailto:hello@adjusterdesk.xyz"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
              >
                Email us
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back to pricing
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-3xl gap-6">
        <div className="text-center">
          <p className="text-sm font-medium text-teal-800">AdjusterDesk signup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Create your AdjusterDesk workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {founding
              ? `${FOUNDING_PRICE_LINE} ${FOUNDING_STANDARD_COMPARE} ${CHECKOUT_CARD_LINE}`
              : `${CHECKOUT_CARD_LINE} Choose a plan and continue to Checkout.`}
          </p>
        </div>

        {founding ? (
          <Card className="grid gap-2 border-teal-200 bg-teal-50">
            <p className="text-sm font-semibold text-slate-950">Founding office signup</p>
            <p className="text-sm leading-6 text-slate-700">{FOUNDING_ONBOARDING} Start with your first 10 active claims. Choose Solo or Small Office. Team stays at $199/month.</p>
            <p className="text-sm leading-6 text-slate-700">{FOUNDING_HONESTY_NOTE}</p>
          </Card>
        ) : null}

        <Card className="grid gap-3 border-teal-200 bg-teal-50">
          <p className="text-sm font-semibold text-slate-950">Plan options — card collected in Checkout, $0 due for 14 days</p>
          <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
            {listPublicPlans().map((plan) => (
              <li key={plan.slug} className="rounded-md border border-teal-200 bg-white px-3 py-2">
                <p className="font-semibold text-slate-950">{plan.label}</p>
                <p>{plan.priceLabel}</p>
                <p>{plan.includedUserLimit} active user{plan.includedUserLimit === 1 ? "" : "s"} included</p>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-5 text-slate-600">{CHECKOUT_CARD_LINE} The standard plan price begins when that trial ends, unless a founding rate is applied after you start.</p>
        </Card>

        <Card className="grid gap-4">
          <SignupSubmitTrackingForm action={startSignupWithState} className="grid gap-4">
            <Field label="Plan" required>
              <select name="plan" defaultValue={defaultPlan.slug} className={selectClassName}>
                {listPublicPlans().map((plan) => (
                  <option key={plan.slug} value={plan.slug}>
                    {plan.label} ({plan.priceLabel}, {plan.includedUserLimit} active user{plan.includedUserLimit === 1 ? "" : "s"})
                  </option>
                ))}
              </select>
              <FieldError name="plan" />
            </Field>

            <Field label="Workspace name" required>
              <input name="firmName" autoComplete="organization" required className={inputClassName} />
              <FieldError name="firmName" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner name" required>
                <input name="ownerName" autoComplete="name" required className={inputClassName} />
                <FieldError name="ownerName" />
              </Field>
              <Field label="Owner phone (optional)">
                <input name="ownerPhone" autoComplete="tel" className={inputClassName} />
                <FieldError name="ownerPhone" />
              </Field>
            </div>

            <Field label="Owner email" required>
              <input name="ownerEmail" type="email" autoComplete="email" required className={inputClassName} />
              <FieldError name="ownerEmail" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" required>
                <input name="password" type="password" autoComplete="new-password" required className={inputClassName} />
                <FieldError name="password" />
              </Field>
              <Field label="Confirm password" required>
                <input name="confirmPassword" type="password" autoComplete="new-password" required className={inputClassName} />
                <FieldError name="confirmPassword" />
              </Field>
            </div>

            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" name="agreedToTerms" className="mt-1 h-4 w-4 rounded border-slate-300" />
              <span>
                I agree to the <Link href="/terms" className="font-medium text-teal-800 hover:underline">Terms</Link> and <Link href="/privacy" className="font-medium text-teal-800 hover:underline">Privacy Policy</Link>.
              </span>
            </label>
            <FieldError name="agreedToTerms" />

            {founding ? <input type="hidden" name="offer" value="founding" /> : null}
            <p className="text-xs leading-5 text-slate-500">By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>. The next step is Stripe Checkout, which collects a card. $0 is due during the 14-day trial.</p>
            <SubmitButton>{founding ? "Continue to founding checkout" : "Continue to checkout"}</SubmitButton>
          </SignupSubmitTrackingForm>
        </Card>

        <p className="text-center text-sm leading-6 text-slate-600">
          <Link href={TRACKER_PAGE_HREF} className="font-medium text-teal-800 hover:text-teal-900">
            Prefer a sheet for now?
          </Link>
        </p>
      </div>
    </main>
  );
}
