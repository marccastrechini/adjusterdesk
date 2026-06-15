"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackCTAEvent, type CTAEventName } from "@/lib/analytics";
import { cn } from "@/lib/utils";

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

export function TrackedButtonLink({
  href,
  eventName,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  eventName: CTAEventName;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <TrackedLink
      href={href}
      eventName={eventName}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition",
        variant === "primary"
          ? "bg-teal-700 text-white hover:bg-teal-800"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </TrackedLink>
  );
}
