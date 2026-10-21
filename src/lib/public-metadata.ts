import type { Metadata } from "next";
import { brandName, canonicalOrigin } from "@/lib/brand";

const fallbackSiteUrl = canonicalOrigin;

function resolvePublicSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || fallbackSiteUrl);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export const publicSiteUrl = resolvePublicSiteUrl();

export function publicPageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: brandName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
