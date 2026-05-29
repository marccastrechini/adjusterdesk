import type { NextConfig } from "next";

const isProductionHttps =
  process.env.NODE_ENV === "production" &&
  (process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") || process.env.APP_BASE_URL?.startsWith("https://"));

const baselineSecurityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), fullscreen=(self)",
  },
  ...(isProductionHttps
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const privateRouteHeaders = [
  {
    key: "Cache-Control",
    value: "no-store",
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  },
];

const privateRouteSources = [
  "/api/:path*",
  "/claims/:path*",
  "/leads/:path*",
  "/money/:path*",
  "/office-resources/:path*",
  "/reports/:path*",
  "/settings/:path*",
  "/start/:path*",
  "/status/:path*",
  "/system/:path*",
  "/today",
  "/login",
  "/feedback",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: baselineSecurityHeaders,
      },
      ...privateRouteSources.map((source) => ({
        source,
        headers: privateRouteHeaders,
      })),
    ];
  },
};

export default nextConfig;
