import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-metadata";

const publicRoutes = [
  "/",
  "/product",
  "/features",
  "/how-it-works",
  "/pricing",
  "/signup",
  "/resources",
  "/demo",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/security",
  "/public-adjuster-software",
  "/free-public-adjuster-claim-tracker",
  "/claimwizard-alternative",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, publicSiteUrl).toString(),
    lastModified: new Date("2026-06-12"),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/public-adjuster") || route.startsWith("/free-") ? 0.8 : 0.7,
  }));
}
