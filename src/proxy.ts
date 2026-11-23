import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalRedirectStatus, canonicalRedirectTarget } from "@/lib/public-canonical";
import { isSandboxHost, NOINDEX_ROBOTS, requestHostname } from "@/lib/site-host";

/**
 * Send plain HTTP and the www host to the canonical https origin.
 * Runs for every path, including favicon and sitemap, so those duplicates
 * redirect too. Local and other hosts are unchanged.
 */
export function proxy(request: NextRequest) {
  const target = canonicalRedirectTarget({
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    cfVisitor: request.headers.get("cf-visitor"),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });

  if (!target) {
    const response = NextResponse.next();
    const hostname = requestHostname(request.headers.get("host"), request.headers.get("x-forwarded-host"));
    if (isSandboxHost(hostname)) {
      response.headers.set("X-Robots-Tag", NOINDEX_ROBOTS);
    }
    return response;
  }

  return NextResponse.redirect(target, canonicalRedirectStatus);
}
