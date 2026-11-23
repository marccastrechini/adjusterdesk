import { isProductionAnalyticsHost } from "@/lib/site-host";

/**
 * GA4 key events for PA ClaimBoard.
 * Events are queued with gtag and sent only on the production host.
 * Sandbox, preview, and local hosts are ignored. Params never include email or names.
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
  | "claim_tracker_download"
  | "trial_account_created"
  | "purchase";

export type DiagnosticEventName =
  | "signup_submit";

export type AnalyticsEventName = CTAEventName | ConversionEventName | DiagnosticEventName;

declare global {
  interface Window {
    gtag?: (command: string, event: string, config?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

const measurementIdPattern = /^G-[A-Z0-9]+$/;

const blockedParamKeys = new Set([
  "email",
  "name",
  "firstname",
  "lastname",
  "fullname",
  "username",
  "useremail",
  "phone",
  "firmname",
  "clientname",
  "officename",
]);

export function gaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
  return measurementIdPattern.test(id) ? id : null;
}

/** Inline bootstrap. Assigns window.gtag before gtag.js loads so early events stay queued. */
export function analyticsBootstrapScript(measurementId: string): string {
  if (!measurementIdPattern.test(measurementId)) {
    throw new Error("Invalid GA measurement id");
  }

  return `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',${JSON.stringify(measurementId)});`;
}

export function sanitizeAnalyticsParams(data?: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!data) {
    return params;
  }

  for (const [key, value] of Object.entries(data)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (blockedParamKeys.has(normalized)) {
      continue;
    }

    if (typeof value === "string" && value.includes("@")) {
      continue;
    }

    if (value !== null && typeof value === "object") {
      continue;
    }

    params[key] = value;
  }

  return params;
}

function ensureGtag(target: Window) {
  target.dataLayer = target.dataLayer || [];
  if (typeof target.gtag !== "function") {
    const queue: Window["gtag"] = (...args) => {
      target.dataLayer?.push(args);
    };
    target.gtag = queue;
  }
}

/**
 * Send a GA4 event for CTA tracking
 * Safe to call even if GA4 is not loaded - gracefully no-ops
 */
export function trackCTAEvent(
  eventName: CTAEventName,
  additionalData?: Record<string, unknown>
): boolean {
  return trackAnalyticsEvent(eventName, {
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
): boolean {
  return trackAnalyticsEvent(eventName, {
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
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isProductionAnalyticsHost(window.location?.hostname)) {
    return false;
  }

  if (!gaMeasurementId()) {
    return false;
  }

  ensureGtag(window);
  window.gtag?.("event", eventName, sanitizeAnalyticsParams(additionalData));
  return true;
}

/**
 * Track page view (optional - GA4 tracks pageviews automatically)
 */
export function trackPageView(page_path: string, page_title?: string): boolean {
  if (typeof window === "undefined" || !isProductionAnalyticsHost(window.location?.hostname) || !gaMeasurementId()) {
    return false;
  }

  ensureGtag(window);
  window.gtag?.("event", "page_view", {
    page_path,
    page_title: page_title || document.title,
  });
  return true;
}
