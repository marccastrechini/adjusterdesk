"use client";

import type { ReactNode } from "react";
import { trackCTAEvent, trackConversionEvent } from "@/lib/analytics";

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
  function handleDownloadTrack() {
    trackCTAEvent("claim_tracker_download_click", { href });
    trackConversionEvent("claim_tracker_download", { href });
  }

  return (
    <a
      href={href}
      download={download}
      className={className}
      onClick={handleDownloadTrack}
    >
      {children}
    </a>
  );
}
