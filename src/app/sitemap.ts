import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-metadata";

const publicRoutes = [
  "/",
  "/product",
  "/features",
  "/how-it-works",
  "/pricing",
  "/resources",
  "/demo",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/security",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, publicSiteUrl).toString(),
    lastModified: new Date("2026-05-29"),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
