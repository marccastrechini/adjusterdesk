import { publicSitemapPaths } from "../src/lib/public-sitemap";

type ValidationIssue = {
  level: "error" | "warn";
  message: string;
};

const defaultBaseUrl = "https://adjusterdesk.xyz";

const expectedPublicPaths = [...publicSitemapPaths];
const canonicalSitemapPath = "/sitemap.xml";
const legacySitemapPath = "/google-sitemap.xml";
const permanentRedirectStatuses = new Set([301, 308]);

function getBaseUrlArg(): string {
  const arg = process.argv.find((value) => value.startsWith("--base-url="));
  const raw = arg ? arg.slice("--base-url=".length) : process.env.BASE_URL || defaultBaseUrl;
  return new URL(raw).toString().replace(/\/$/, "");
}

function parseSitemapLocs(xml: string): string[] {
  const locPattern = /<loc>([^<]+)<\/loc>/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null = locPattern.exec(xml);
  while (match) {
    urls.push(match[1]);
    match = locPattern.exec(xml);
  }
  return urls;
}

function isLikelyLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function normalizeContentType(contentType: string | null): string {
  return (contentType || "").toLowerCase().trim();
}

function getWildcardUserAgentDisallowLines(robotsText: string): string[] {
  const lines = robotsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const disallowLines: string[] = [];
  let inWildcardGroup = false;

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      inWildcardGroup = value === "*";
      continue;
    }

    if (inWildcardGroup && key === "disallow") {
      disallowLines.push(`Disallow: ${value}`);
    }
  }

  return disallowLines;
}

async function fetchNoRedirect(url: string): Promise<Response> {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "*/*",
      "User-Agent": "adjusterdesk-crawl-validator/1.0",
    },
  });
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

async function validateSitemap({
  sitemapUrl,
  expectedPaths,
  issues,
}: {
  sitemapUrl: string;
  expectedPaths: string[];
  issues: ValidationIssue[];
}): Promise<void> {
  const sitemapResponse = await fetchNoRedirect(sitemapUrl);
  if (sitemapResponse.status !== 200) {
    issues.push({ level: "error", message: `Sitemap status must be 200, got ${sitemapResponse.status}: ${sitemapUrl}` });
  }

  const sitemapContentType = normalizeContentType(sitemapResponse.headers.get("content-type"));
  if (!(sitemapContentType.includes("application/xml") || sitemapContentType.includes("text/xml"))) {
    issues.push({ level: "error", message: `Sitemap content-type must be XML, got '${sitemapContentType || "(missing)"}': ${sitemapUrl}` });
  }

  const sitemapContentEncoding = normalizeContentType(sitemapResponse.headers.get("content-encoding"));
  if (
    sitemapContentEncoding &&
    !["gzip", "br", "deflate"].some((encoding) => sitemapContentEncoding.includes(encoding))
  ) {
    issues.push({ level: "warn", message: `Uncommon sitemap content-encoding '${sitemapContentEncoding}': ${sitemapUrl}` });
  }

  const sitemapText = await sitemapResponse.text();
  const trimmedSitemapText = sitemapText.trim();
  if (!trimmedSitemapText.startsWith("<?xml")) {
    issues.push({ level: "error", message: `Sitemap body does not start with XML declaration: ${sitemapUrl}` });
  }
  if (!trimmedSitemapText.includes("<urlset")) {
    issues.push({ level: "error", message: `Sitemap body does not contain <urlset>: ${sitemapUrl}` });
  }
  if (/<html[\s>]/i.test(trimmedSitemapText)) {
    issues.push({ level: "error", message: `Sitemap appears to include an HTML shell: ${sitemapUrl}` });
  }

  const sitemapLocs = parseSitemapLocs(trimmedSitemapText);
  if (sitemapLocs.length === 0) {
    issues.push({ level: "error", message: `Sitemap contains no <loc> URLs: ${sitemapUrl}` });
  }

  const sitemapPathSet = new Set(
    sitemapLocs
      .map((loc) => {
        try {
          return new URL(loc).pathname;
        } catch {
          return "";
        }
      })
      .filter((pathname) => pathname.length > 0),
  );

  for (const path of expectedPaths) {
    if (!sitemapPathSet.has(path)) {
      issues.push({ level: "error", message: `Sitemap is missing expected path '${path}': ${sitemapUrl}` });
    }
  }

  for (const url of sitemapLocs) {
    const urlResponse = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "adjusterdesk-crawl-validator/1.0",
      },
    });

    const okStatus = urlResponse.status === 200 || [301, 302, 307, 308].includes(urlResponse.status);
    if (!okStatus) {
      issues.push({ level: "error", message: `Sitemap URL returned ${urlResponse.status}: ${url}` });
      continue;
    }

    if ([301, 302, 307, 308].includes(urlResponse.status)) {
      const location = urlResponse.headers.get("location");
      if (!location) {
        issues.push({ level: "error", message: `Redirect is missing Location header: ${url}` });
      }
    }
  }

  if (sitemapResponse.status === 401 || sitemapResponse.status === 403) {
    issues.push({ level: "error", message: `Sitemap appears to require auth (401/403): ${sitemapUrl}` });
  }
}

async function validate(baseUrl: string): Promise<{ issues: ValidationIssue[] }> {
  const issues: ValidationIssue[] = [];

  const robotsUrl = toAbsoluteUrl(baseUrl, "/robots.txt");

  await validateSitemap({
    sitemapUrl: toAbsoluteUrl(baseUrl, canonicalSitemapPath),
    expectedPaths: expectedPublicPaths,
    issues,
  });
  await validateLegacySitemapRedirect(baseUrl, issues);
  await validateFavicon(baseUrl, issues);
  await validateCanonicalHostRedirects(baseUrl, issues);

  const robotsResponse = await fetchNoRedirect(robotsUrl);
  if (robotsResponse.status !== 200) {
    issues.push({ level: "error", message: `Robots status must be 200, got ${robotsResponse.status}` });
  }

  const robotsContentType = normalizeContentType(robotsResponse.headers.get("content-type"));
  if (!robotsContentType.includes("text/plain")) {
    issues.push({ level: "error", message: `Robots content-type must be text/plain, got '${robotsContentType || "(missing)"}'` });
  }

  const robotsText = await robotsResponse.text();
  const currentHostIsLocal = isLikelyLocalHost(new URL(baseUrl).hostname);
  const robotsSitemapValues = [...robotsText.matchAll(/^Sitemap:\s*(.+)$/gim)].map((match) => match[1].trim());
  if (robotsSitemapValues.length !== 1) {
    issues.push({
      level: "error",
      message: `Robots should advertise one sitemap, found ${robotsSitemapValues.length}: ${robotsSitemapValues.join(", ") || "(none)"}`,
    });
  }

  const expectedSitemapUrl = toAbsoluteUrl(baseUrl, canonicalSitemapPath);
  const matchedSitemapValue = robotsSitemapValues.find((value) => {
    try {
      return new URL(value).pathname === canonicalSitemapPath;
    } catch {
      return false;
    }
  });

  if (!matchedSitemapValue) {
    issues.push({ level: "error", message: `Robots is missing sitemap path '${canonicalSitemapPath}'` });
  } else if (!currentHostIsLocal && matchedSitemapValue !== expectedSitemapUrl) {
    issues.push({ level: "error", message: `Robots sitemap line should be '${expectedSitemapUrl}', got '${matchedSitemapValue}'` });
  }

  if (robotsSitemapValues.some((value) => value.includes(legacySitemapPath))) {
    issues.push({ level: "error", message: "Robots should not advertise the legacy google-sitemap.xml URL." });
  }

  const wildcardDisallowLines = new Set(getWildcardUserAgentDisallowLines(robotsText));

  const disallowedPublicPaths = [
    "/",
    "/pricing",
    "/signup",
    "/public-adjuster-software",
    "/free-public-adjuster-claim-tracker",
    "/claimwizard-alternative",
  ];

  for (const path of disallowedPublicPaths) {
    const blockedLine = `Disallow: ${path}`;
    if (wildcardDisallowLines.has(blockedLine)) {
      issues.push({ level: "error", message: `Robots appears to block public path via '${blockedLine}'` });
    }
  }

  if (robotsText.includes("BEGIN Cloudflare Managed content")) {
    issues.push({
      level: "warn",
      message: "Cloudflare managed robots block detected. This can coexist with app robots rules, but should be reviewed in dashboard if Google fetch issues persist.",
    });
  }
  return { issues };
}

function isProductionSite(baseUrl: string): boolean {
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  return hostname === "adjusterdesk.xyz" || hostname === "www.adjusterdesk.xyz";
}

async function validateLegacySitemapRedirect(baseUrl: string, issues: ValidationIssue[]): Promise<void> {
  const legacyUrl = toAbsoluteUrl(baseUrl, legacySitemapPath);
  const response = await fetchNoRedirect(legacyUrl);
  if (!permanentRedirectStatuses.has(response.status)) {
    issues.push({
      level: "error",
      message: `Legacy sitemap should permanently redirect, got ${response.status}: ${legacyUrl}`,
    });
    return;
  }

  const location = response.headers.get("location");
  if (!location) {
    issues.push({ level: "error", message: `Legacy sitemap redirect is missing Location: ${legacyUrl}` });
    return;
  }

  const resolved = new URL(location, legacyUrl);
  if (resolved.pathname !== canonicalSitemapPath) {
    issues.push({
      level: "error",
      message: `Legacy sitemap should redirect to ${canonicalSitemapPath}, got '${location}'`,
    });
  }
}

async function validateFavicon(baseUrl: string, issues: ValidationIssue[]): Promise<void> {
  const faviconUrl = toAbsoluteUrl(baseUrl, "/favicon.ico");
  const response = await fetchNoRedirect(faviconUrl);
  if (response.status !== 200) {
    issues.push({ level: "error", message: `Favicon status must be 200, got ${response.status}` });
  }

  const contentType = normalizeContentType(response.headers.get("content-type"));
  if (!(contentType.includes("image/") || contentType.includes("icon"))) {
    issues.push({ level: "error", message: `Favicon content-type must be an image, got '${contentType || "(missing)"}'` });
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 16) {
    issues.push({ level: "error", message: "Favicon body is empty." });
    return;
  }

  const looksLikeIco = bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0;
  const looksLikePng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!looksLikeIco && !looksLikePng) {
    issues.push({ level: "error", message: "Favicon body is not an ICO or PNG file." });
  }
}

async function validateCanonicalHostRedirects(baseUrl: string, issues: ValidationIssue[]): Promise<void> {
  if (!isProductionSite(baseUrl)) {
    return;
  }

  const probes = [
    "http://adjusterdesk.xyz/",
    "http://adjusterdesk.xyz/how-it-works",
    "http://adjusterdesk.xyz/cookies",
    "http://adjusterdesk.xyz/signup",
    "http://www.adjusterdesk.xyz/",
    "https://www.adjusterdesk.xyz/",
    "https://www.adjusterdesk.xyz/cookies",
  ];

  for (const url of probes) {
    const response = await fetchNoRedirect(url);
    const expectedPath = new URL(url).pathname;
    if (!permanentRedirectStatuses.has(response.status)) {
      issues.push({
        level: "error",
        message: `Expected permanent redirect for ${url}, got ${response.status}`,
      });
      continue;
    }

    const location = response.headers.get("location");
    if (!location) {
      issues.push({ level: "error", message: `Redirect is missing Location header: ${url}` });
      continue;
    }

    const resolved = new URL(location, url);
    const expected = new URL(expectedPath, "https://adjusterdesk.xyz");
    if (resolved.origin !== expected.origin || resolved.pathname !== expected.pathname) {
      issues.push({
        level: "error",
        message: `Expected redirect to ${expected.origin}${expected.pathname}, got '${location}' for ${url}`,
      });
    }
  }
}

async function main() {
  const baseUrl = getBaseUrlArg();
  console.log(`Validating crawl surface for ${baseUrl}`);

  const { issues } = await validate(baseUrl);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warn");

  for (const warning of warnings) {
    console.warn(`WARN: ${warning.message}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Crawl surface validation passed.");
}

main().catch((error: unknown) => {
  console.error("Validation failed due to unexpected error.");
  console.error(error);
  process.exitCode = 1;
});