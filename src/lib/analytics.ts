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
  | "onboarding_add_first_claim_click"
  | "onboarding_open_today_click"
  | "onboarding_open_documents_click"
  | "onboarding_open_money_click"
  | "product_feature_view";

export type ConversionEventName =
  | "sign_up"
  | "trial_created"
  | "workspace_created"
  | "first_claim_created"
  | "claim_tracker_download";

export type AnalyticsEventName = CTAEventName | ConversionEventName;

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
  trackAnalyticsEvent(eventName, {
    event_category: "cta",
    event_label: eventName,
    ...additionalData,
  });
}

/**
 * Send a GA4 event for conversion and activation milestones.
 */
export function trackConversionEvent(
  eventName: ConversionEventName,
  additionalData?: Record<string, unknown>
): void {
  trackAnalyticsEvent(eventName, {
    event_category: "conversion",
    event_label: eventName,
    ...additionalData,
  });
}

/**
 * Low-level GA4 event sender.
 */
export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  additionalData?: Record<string, unknown>
): void {
  // Only send if gtag is available
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, additionalData);
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
