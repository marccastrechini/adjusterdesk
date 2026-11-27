import { canonicalOrigin } from "@/lib/brand";

export const resourceArticlePath = "/resources/keep-improve-or-choose-a-provider" as const;

export const resourceArticleTitle =
  "Keep It, Improve It, or Choose a Provider? Three Sensible Paths for Your PA Office";

/** One sentence for the page description and social cards. */
export const resourceArticleDescription =
  "Choose between keeping your current system, building improvements with AI, or working with a provider.";

export const resourceArticleCanonicalUrl = `${canonicalOrigin}${resourceArticlePath}`;

/** Month precision matches the published byline, November 2026. */
export const resourceArticlePublished = "2026-11";

export const resourceArticleAuthorName = "Marc Castrechini";

export const resourceArticleNavLabel = "Keep, improve, or choose";
