import { trainingPublicPaths } from "./training";

export const canonicalSiteOrigin = "https://adjusterdesk.xyz";
export const canonicalSitemapPath = "/sitemap.xml";

/**
 * Marketing URLs that belong in the public sitemap.
 * Keep this aligned with public/sitemap.xml. The checked-in file is what
 * crawlers fetch; the unit test fails if the two lists drift.
 */
export const publicSitemapPaths = [
  "/",
  "/product",
  "/features",
  "/how-it-works",
  "/pricing",
  "/signup",
  "/resources",
  "/help",
  ...trainingPublicPaths,
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
] as const;

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildPublicSitemapXml(origin = canonicalSiteOrigin): string {
  const urls = publicSitemapPaths
    .map((path) => `  <url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
