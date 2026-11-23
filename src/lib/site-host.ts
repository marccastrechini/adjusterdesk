import { canonicalHost } from "@/lib/brand";

/** HTML robots meta and X-Robots-Tag value for app, auth, and sandbox hosts. */
export const NOINDEX_ROBOTS = "noindex,nofollow";

export function hostnameFromHeader(value: string | null | undefined): string | null {
  const first = value?.split(",")[0]?.trim().toLowerCase();
  if (!first) {
    return null;
  }

  if (first.startsWith("[")) {
    const end = first.indexOf("]");
    return end >= 0 ? first.slice(0, end + 1) : first;
  }

  const colon = first.indexOf(":");
  const hostname = (colon >= 0 ? first.slice(0, colon) : first).replace(/\.$/, "");
  return hostname || null;
}

/**
 * Hostname used for indexing and analytics.
 * A sandbox label on either header wins. Otherwise a public production host wins
 * over an internal proxy host.
 */
export function requestHostname(hostHeader: string | null | undefined, forwardedHost: string | null | undefined): string | null {
  const forwarded = hostnameFromHeader(forwardedHost);
  const host = hostnameFromHeader(hostHeader);
  if (isSandboxHost(forwarded)) {
    return forwarded;
  }
  if (isSandboxHost(host)) {
    return host;
  }
  if (isProductionAnalyticsHost(forwarded)) {
    return forwarded;
  }
  if (isProductionAnalyticsHost(host)) {
    return host;
  }
  return forwarded ?? host;
}

export function isSandboxHost(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }

  return hostname.split(".").includes("sandbox");
}

/** GA4 key events and the gtag script run only on the production site. */
export function isProductionAnalyticsHost(hostname: string | null | undefined): boolean {
  return hostname === canonicalHost || hostname === `www.${canonicalHost}`;
}
