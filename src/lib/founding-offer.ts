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

export const FOUNDING_HONESTY_NOTE =
  "Stripe Checkout collects a card at signup. $0 is due during the 14-day trial Stripe starts today. The founding offer is $0 for 90 days, then $29/month Solo or $49/month Small Office, locked for 12 months. That longer $0 period and the $29/$49 lock are not in Stripe yet. Reply to hello@adjusterdesk.xyz if you are in the first 10 and we will apply the founding rate.";

export const FOUNDING_OPS_ALERT =
  "Founding office request. Apply $0 for 90 days, then locked Solo $29/month or Small Office $49/month if this office is in the first 10.";

export function isFoundingOffer(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "founding";
}

export function resolveSignupSource(offer: string | null | undefined) {
  return isFoundingOffer(offer) ? "founding" : "public-signup";
}
