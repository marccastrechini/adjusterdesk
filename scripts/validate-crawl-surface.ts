type ValidationIssue = {
  level: "error" | "warn";
  message: string;
};

const defaultBaseUrl = "https://adjusterdesk.xyz";

const expectedPublicPaths = [
  "/",
  "/product",
  "/features",
  "/how-it-works",
  "/pricing",
  "/signup",
  "/help",
  "/demo",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/security",
  "/public-adjuster-software",
  "/free-public-adjuster-claim-tracker",
  "/claimwizard-alternative",
  "/resources",
];

const sitemapPaths = ["/sitemap.xml", "/google-sitemap.xml"];

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

  for (const sitemapPath of sitemapPaths) {
    await validateSitemap({
      sitemapUrl: toAbsoluteUrl(baseUrl, sitemapPath),
      expectedPaths: expectedPublicPaths,
      issues,
    });
  }

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
  if (robotsSitemapValues.length === 0) {
    issues.push({ level: "error", message: "Robots is missing a Sitemap line." });
  }

  for (const sitemapPath of sitemapPaths) {
    const expectedSitemapUrl = toAbsoluteUrl(baseUrl, sitemapPath);
    const matchedSitemapValue = robotsSitemapValues.find((value) => {
      try {
        return new URL(value).pathname === sitemapPath;
      } catch {
        return false;
      }
    });

    if (!matchedSitemapValue) {
      issues.push({ level: "error", message: `Robots is missing sitemap path '${sitemapPath}'` });
      continue;
    }

    if (!currentHostIsLocal && matchedSitemapValue !== expectedSitemapUrl) {
      issues.push({ level: "error", message: `Robots sitemap line should be '${expectedSitemapUrl}', got '${matchedSitemapValue}'` });
    }
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