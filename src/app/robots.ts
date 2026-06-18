import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/accept-invite",
          "/claims/",
          "/feedback",
          "/forgot-password",
          "/leads/",
          "/login",
          "/money/",
          "/office-resources/",
          "/reports/",
          "/reset-password",
          "/settings/",
          "/start/",
          "/status/",
          "/system/",
          "/today",
        ],
      },
    ],
    sitemap: [
      new URL("/sitemap.xml", publicSiteUrl).toString(),
      new URL("/google-sitemap.xml", publicSiteUrl).toString(),
    ],
  };
}
