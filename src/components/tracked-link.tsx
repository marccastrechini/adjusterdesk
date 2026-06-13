"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackCTAEvent, type CTAEventName } from "@/lib/analytics";

export function TrackedLink({
  href,
  eventName,
  className,
  children,
}: {
  href: string;
  eventName: CTAEventName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackCTAEvent(eventName, { href })}>
      {children}
    </Link>
  );
}
