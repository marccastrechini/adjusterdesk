/**
 * Lightweight GA4 event tracking for AdjusterDesk
 * Only sends events if window.gtag is available (GA4 loaded)
 */

export type CTAEventName =
  | "trial_start_click"
  | "claim_tracker_download_click"
  | "demo_request_click"
  | "pricing_click"
  | "login_click"
  | "signup_click"
  | "product_feature_view";

declare global {
  interface Window {
    gtag?: (command: string, event: string, config?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Send a GA4 event for CTA tracking
 * Safe to call even if GA4 is not loaded - gracefully no-ops
 */
export function trackCTAEvent(
  eventName: CTAEventName,
  additionalData?: Record<string, unknown>
): void {
  // Only send if gtag is available
  if (typeof window !== "undefined" && window.gtag) {
    const eventData: Record<string, unknown> = {
      event_category: "cta",
      event_label: eventName,
      ...additionalData,
    };

    window.gtag("event", eventName, eventData);
  }
}

/**
 * Track page view (optional - GA4 tracks pageviews automatically)
 */
export function trackPageView(page_path: string, page_title?: string): void {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", {
      page_path,
      page_title: page_title || document.title,
    });
  }
}
