export const FOUNDING_SUPPORT_EMAIL = "hello@adjusterdesk.xyz";

export const FOUNDING_SOLO_SIGNUP_HREF = "/signup?plan=solo&offer=founding";
export const FOUNDING_SMALL_OFFICE_SIGNUP_HREF = "/signup?plan=small-office&offer=founding";
export const FOUNDING_PAGE_HREF = "/founding-public-adjuster-offices";
export const TRACKER_PAGE_HREF = "/free-public-adjuster-claim-tracker";

export const FOUNDING_PRICE_LINE =
  "$0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months.";

export const FOUNDING_STANDARD_COMPARE = "Standard pricing is Solo $49/month and Small Office $99/month.";

export const FOUNDING_ONBOARDING =
  "Async onboarding, no sales call. Email support at hello@adjusterdesk.xyz.";

export const FOUNDING_TERMS = [
  "First 10 founding offices only.",
  FOUNDING_PRICE_LINE,
  FOUNDING_STANDARD_COMPARE,
  "Start with your first 10 active claims.",
  FOUNDING_ONBOARDING,
] as const;

export const CHECKOUT_CARD_LINE =
  "Stripe Checkout collects a card at signup. $0 is due during the 14-day trial.";

export const FOUNDING_TRIAL_DUE_LINE =
  "Checkout collects a card. $0 is due during the 90-day trial, then the founding monthly rate.";

// Founding Checkout is live: $29 Solo / $49 Small Office after a 90-day $0 trial. The 12-month lock is a commercial promise, not an automatic Stripe price change.
export const FOUNDING_HONESTY_NOTE =
  "Stripe Checkout collects a card at signup. For the first 10 founding offices, $0 is due during the 90-day trial, then $29/month Solo or $49/month Small Office, locked for 12 months. Standard pricing stays Solo $49/month, Small Office $99/month, and Team $199/month, with $0 due during a 14-day trial.";

export const FOUNDING_OPS_ALERT =
  "Founding office signup. Checkout charges $0 for 90 days, then Solo $29/month or Small Office $49/month. Confirm this office is within the first 10. The 12-month lock is a promise to keep, not an automatic Stripe price change.";

export function isFoundingOffer(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "founding";
}

export function resolveSignupSource(offer: string | null | undefined) {
  return isFoundingOffer(offer) ? "founding" : "public-signup";
}
