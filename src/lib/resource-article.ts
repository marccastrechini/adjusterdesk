import { canonicalOrigin } from "@/lib/brand";

export const resourceArticlePath = "/resources/ai-and-your-claims-software" as const;

export const resourceArticleTitle =
  "AI and Your Claims Software: Four Honest Options for Small PA Offices";

/** One sentence for the page description and social cards. */
export const resourceArticleDescription =
  "Four honest options for small PA offices: keep your claims system, use AI to tune it, build your own, or use a provider.";

export const resourceArticleCanonicalUrl = `${canonicalOrigin}${resourceArticlePath}`;

/** Month precision matches the published byline, November 2026. */
export const resourceArticlePublished = "2026-11";

/** Full date for Article JSON-LD dateModified. */
export const resourceArticleModified = "2026-11-27";

export const resourceArticleAuthorName = "PA ClaimBoard";

export const resourceArticleNavLabel = "AI and your claims software";
