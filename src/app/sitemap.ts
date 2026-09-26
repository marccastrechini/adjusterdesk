import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-metadata";
import { trainingPublicPaths } from "@/lib/training";

const publicRoutes = [
  "/",
  "/product",
  "/features",
  "/how-it-works",
  "/pricing",
  "/signup",
  "/resources",
  "/help",
  "/demo",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/security",
  "/public-adjuster-software",
  "/free-public-adjuster-claim-tracker",
  "/founding-public-adjuster-offices",
  "/claimwizard-alternative",
  ...trainingPublicPaths,
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, publicSiteUrl).toString(),
    lastModified: new Date("2026-06-12"),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route.startsWith("/public-adjuster") || route.startsWith("/free-") ? 0.8 : 0.7,
  }));
}
