/**
 * Customer-facing brand, canonical site, and mailbox addresses.
 *
 * Change the product name or canonical domain here. Mailboxes stay on the
 * current working domain until @paclaimboard.com mail exists and can send.
 */

export const brandName = "PA ClaimBoard";
/** Wordmark, site title, and trademark notice only. Body copy, email, and legal text stay on brandName. */
export const brandNameTM = `${brandName}™`;
export const brandMonogram = "PA";
export const brandTagline = "For small public adjusting offices";

/** Production origin when NEXT_PUBLIC_SITE_URL and APP_BASE_URL are unset. */
export const canonicalHost = "paclaimboard.com";
export const canonicalOrigin = `https://${canonicalHost}`;

/**
 * Working support mailbox. Switch this to hello@paclaimboard.com once that
 * mailbox exists. Do not point sending at an address that cannot receive mail.
 */
export const supportEmail = "hello@adjusterdesk.xyz";

/** Working admin mailbox. Not published as a public contact address. */
export const adminEmail = "admin@adjusterdesk.xyz";

/** Operator addresses on this domain may send outreach. Stays until mailboxes move. */
export const operatorEmailDomain = "adjusterdesk.xyz";

export const defaultSystemEmailFrom = `${brandName} <${supportEmail}>`;

/** Display name still present in some deployed SYSTEM_EMAIL_FROM values. */
const retiredBrandDisplayName = "AdjusterDesk";

export function supportMailto(subject?: string) {
  const base = `mailto:${supportEmail}`;
  const trimmed = subject?.trim();
  if (!trimmed) {
    return base;
  }
  return `${base}?subject=${encodeURIComponent(trimmed)}`;
}

export function brandFromAddress(email: string = supportEmail) {
  return `${brandName} <${email}>`;
}

/**
 * Prefer a configured From header. A retired product display name is rewritten
 * so outbound mail does not keep the old brand, and the admin mailbox is never
 * used as the sender.
 */
export function resolveBrandFromHeader(configured: string | undefined | null): { from: string; fromEmail: string } {
  const value = configured?.trim() || defaultSystemEmailFrom;
  const match = value.match(/^(.*?)\s*<([^>]+)>\s*$/);
  const rawEmail = (match?.[2] || value).trim().toLowerCase();
  const fromEmail = rawEmail === adminEmail ? supportEmail : rawEmail;
  const displayName = match?.[1]?.trim().replace(/^"|"$/g, "") ?? "";
  const name = !displayName || displayName === retiredBrandDisplayName ? brandName : displayName;
  return {
    from: `${name} <${fromEmail}>`,
    fromEmail,
  };
}

/** Reply-To falls back to support, and never to the admin mailbox. */
export function resolveBrandReplyTo(configured: string | undefined | null) {
  const value = (configured?.trim() || supportEmail).toLowerCase();
  return value === adminEmail ? supportEmail : value;
}
