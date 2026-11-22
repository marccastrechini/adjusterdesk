import type { Metadata } from "next";
import { brandName, canonicalOrigin } from "@/lib/brand";

export const socialImagePath = "/og.png";
export const socialImageAlt = "PA ClaimBoard, public adjuster CRM and claims management software";

const socialImage = {
  url: socialImagePath,
  width: 1200,
  height: 630,
  alt: socialImageAlt,
};

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
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImagePath],
    },
  };
}
