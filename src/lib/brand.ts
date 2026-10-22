/**
 * Customer-facing brand, canonical site, and mailbox addresses.
 *
 * Change the product name or canonical domain here. Public and system mail
 * uses hello@paclaimboard.com and admin@paclaimboard.com.
 */

export const brandName = "PA ClaimBoard";
/** Wordmark, site title, and trademark notice only. Body copy, email, and legal text stay on brandName. */
export const brandNameTM = `${brandName}™`;
export const brandMonogram = "PA";
export const brandTagline = "For small public adjusting offices";

/** Production origin when NEXT_PUBLIC_SITE_URL and APP_BASE_URL are unset. */
export const canonicalHost = "paclaimboard.com";
export const canonicalOrigin = `https://${canonicalHost}`;

/** Public support mailbox. This address exists and can send. */
export const supportEmail = "hello@paclaimboard.com";

/** System admin mailbox. Not published as a public contact address. */
export const adminEmail = "admin@paclaimboard.com";

/** Previous admin mailbox. Still blocked as a From or Reply-To sender. */
const retiredAdminEmail = "admin@adjusterdesk.xyz";

const blockedAdminSenders = new Set([adminEmail, retiredAdminEmail]);

export function isBlockedAdminSender(email: string) {
  return blockedAdminSenders.has(email.trim().toLowerCase());
}

/** Outreach Reply-To may use either domain for now. */
export const operatorEmailDomains = ["paclaimboard.com", "adjusterdesk.xyz"] as const;

/**
 * Demo and QA mailbox domain. Outreach acceptance is isOperatorEmailAddress,
 * which allows every domain in operatorEmailDomains.
 */
export const operatorEmailDomain = "adjusterdesk.xyz";

export function isOperatorEmailAddress(email: string) {
  const value = email.trim().toLowerCase();
  if (!value || isBlockedAdminSender(value)) {
    return false;
  }
  return operatorEmailDomains.some((domain) => value.endsWith(`@${domain}`));
}

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
  const fromEmail = isBlockedAdminSender(rawEmail) ? supportEmail : rawEmail;
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
  return isBlockedAdminSender(value) ? supportEmail : value;
}
