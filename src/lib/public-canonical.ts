export const canonicalHost = "adjusterdesk.xyz";
export const canonicalOrigin = "https://adjusterdesk.xyz";
export const canonicalRedirectStatus = 308;

const wwwHost = `www.${canonicalHost}`;
const canonicalHosts = new Set([canonicalHost, wwwHost]);

export type CanonicalRedirectInput = {
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  cfVisitor: string | null;
  pathname: string;
  search: string;
};

function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function normalizeHostname(value: string | null): string | null {
  const raw = firstHeaderValue(value);
  if (!raw) {
    return null;
  }

  let host = raw.toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(0, end + 1) : host;
  }

  const colon = host.indexOf(":");
  if (colon >= 0) {
    host = host.slice(0, colon);
  }
  return host || null;
}

function publicHostname(host: string | null, forwardedHost: string | null): string | null {
  const forwarded = normalizeHostname(forwardedHost);
  if (forwarded && canonicalHosts.has(forwarded)) {
    return forwarded;
  }
  return normalizeHostname(host);
}

function cfVisitorScheme(value: string | null): "http" | "https" | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as { scheme?: unknown };
    if (parsed.scheme === "http" || parsed.scheme === "https") {
      return parsed.scheme;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Visitor scheme from the edge. CF-Visitor wins because Cloudflare sets it
 * from the client connection. Otherwise use only the first X-Forwarded-Proto
 * token so a later hop cannot mark HTTPS as HTTP and cause a redirect loop.
 * Missing scheme means "unknown": do not protocol-redirect.
 */
export function visitorScheme(cfVisitor: string | null, forwardedProto: string | null): "http" | "https" | null {
  const fromCloudflare = cfVisitorScheme(cfVisitor);
  if (fromCloudflare) {
    return fromCloudflare;
  }

  const first = firstHeaderValue(forwardedProto)?.toLowerCase();
  if (first === "http" || first === "https") {
    return first;
  }
  return null;
}

function isSafePath(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("\\") && !pathname.includes("://");
}

function isSafeSearch(search: string): boolean {
  return search === "" || (search.startsWith("?") && !search.includes("#") && !search.includes("\\") && !search.includes("://"));
}

/**
 * Permanent redirect target for plain HTTP and www hosts.
 * Returns null when the request is already on https://adjusterdesk.xyz,
 * or when the host is not one of the public site hosts (localhost, preview).
 */
export function canonicalRedirectTarget(input: CanonicalRedirectInput): string | null {
  const hostname = publicHostname(input.host, input.forwardedHost);
  if (!hostname || !canonicalHosts.has(hostname)) {
    return null;
  }

  if (!isSafePath(input.pathname) || !isSafeSearch(input.search)) {
    return null;
  }

  const isWww = hostname === wwwHost;
  const scheme = visitorScheme(input.cfVisitor, input.forwardedProto);
  if (!isWww && scheme !== "http") {
    return null;
  }

  const destination = new URL(`${input.pathname}${input.search}`, canonicalOrigin);
  if (destination.origin !== canonicalOrigin || destination.username || destination.password) {
    return null;
  }

  return destination.toString();
}
