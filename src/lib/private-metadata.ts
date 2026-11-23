import type { Metadata } from "next";
import { brandName } from "@/lib/brand";
import { NOINDEX_ROBOTS } from "@/lib/site-host";

export function privatePageMetadata(title: string, description?: string): Metadata {
  return {
    title: `${title} | ${brandName}`,
    ...(description ? { description } : {}),
    robots: NOINDEX_ROBOTS,
  };
}
