"use client";

import { useEffect } from "react";
import { trackConversionEvent, type ConversionEventName } from "@/lib/analytics";

export function AnalyticsOnLoad({
  eventName,
  dedupeKey,
  eventData,
}: {
  eventName: ConversionEventName;
  dedupeKey: string;
  eventData?: Record<string, unknown>;
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = `ga4:onload:${dedupeKey}`;
    if (window.sessionStorage.getItem(storageKey) === "1") {
      return;
    }

    trackConversionEvent(eventName, eventData);
    window.sessionStorage.setItem(storageKey, "1");
  }, [dedupeKey, eventData, eventName]);

  return null;
}
