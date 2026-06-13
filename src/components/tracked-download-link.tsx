"use client";

import type { ReactNode } from "react";
import { trackCTAEvent } from "@/lib/analytics";

export function TrackedDownloadLink({
  href,
  download,
  className,
  children,
}: {
  href: string;
  download?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      download={download}
      className={className}
      onClick={() => trackCTAEvent("claim_tracker_download_click", { href })}
    >
      {children}
    </a>
  );
}
