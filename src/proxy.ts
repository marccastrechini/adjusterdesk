import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalRedirectStatus, canonicalRedirectTarget } from "@/lib/public-canonical";

/**
 * Send plain HTTP and www.adjusterdesk.xyz to https://adjusterdesk.xyz.
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
    return NextResponse.next();
  }

  return NextResponse.redirect(target, canonicalRedirectStatus);
}
