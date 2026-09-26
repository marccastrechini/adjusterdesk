import { expect, test } from "@playwright/test";

const trustPages = [
  { path: "/about", heading: "A desk for small public adjusting offices.", copy: "Marc works on the product. Jenn works with customers." },
  { path: "/contact", heading: "Email hello@adjusterdesk.xyz.", copy: "We try to reply within a few business days." },
  { path: "/privacy", heading: "How AdjusterDesk handles information.", copy: "Information from workspace setup, demo, and contact requests" },
  { path: "/terms", heading: "Plain terms for using AdjusterDesk.", copy: "Professional judgment and advice" },
  { path: "/cookies", heading: "How AdjusterDesk uses cookies.", copy: "Strictly necessary cookies" },
  { path: "/accessibility", heading: "A practical commitment to accessible public pages.", copy: "Accessibility commitment" },
  { path: "/security", heading: "Practical security notes for AdjusterDesk.", copy: "What AdjusterDesk does not claim" },
];

const footerLinks = [
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Cookies", href: "/cookies" },
  { name: "Accessibility", href: "/accessibility" },
  { name: "Security", href: "/security" },
  { name: "Email us", href: "mailto:hello@adjusterdesk.xyz" },
];

test("public trust pages render and footer links are available", async ({ page }) => {
  for (const trustPage of trustPages) {
    await page.goto(trustPage.path);
    await expect(page.getByRole("heading", { name: trustPage.heading, exact: true })).toBeVisible();
    await expect(page.getByText(trustPage.copy, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start (using AdjusterDesk|free trial)/i }).first()).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("link", { name: "Email us", exact: true }).first()).toHaveAttribute("href", "mailto:hello@adjusterdesk.xyz");
    await expect(page.getByRole("link", { name: "Log in", exact: true }).first()).toHaveAttribute("href", "/login");

    for (const footerLink of footerLinks) {
      await expect(page.getByRole("contentinfo").getByRole("link", { name: footerLink.name, exact: true })).toHaveAttribute("href", footerLink.href);
    }
  }
});

test("public SEO routes and security headers are present", async ({ request }) => {
  const pricingResponse = await request.get("/pricing");
  expect(pricingResponse.ok()).toBeTruthy();
  expect(pricingResponse.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(pricingResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(pricingResponse.headers()["x-frame-options"]).toBe("DENY");
  expect(pricingResponse.headers()["permissions-policy"]).toContain("camera=()");

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.ok()).toBeTruthy();
  const robotsText = await robotsResponse.text();
  expect(robotsText).toContain("Sitemap: ");
  expect(robotsText).toContain("/sitemap.xml");
  expect(robotsText).not.toContain("/google-sitemap.xml");
  expect(robotsText).toContain("Disallow: /login");
  expect(robotsText).toContain("Disallow: /claims/");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  expect(sitemapResponse.headers()["content-type"]).toContain("xml");
  const sitemapText = await sitemapResponse.text();
  expect(sitemapText).toContain("https://adjusterdesk.xyz/pricing");
  expect(sitemapText).toContain("/about");
  expect(sitemapText).toContain("/contact");
  expect(sitemapText).toContain("/privacy");
  expect(sitemapText).toContain("/security");
  expect(sitemapText).toContain("/free-public-adjuster-claim-tracker");
  expect(sitemapText).toContain("/training/desk-overview");
  expect(sitemapText).toContain("/founding-public-adjuster-offices");
  expect(sitemapText).not.toContain("/claims");
  expect(sitemapText).not.toContain("<html");

  const legacySitemapResponse = await request.get("/google-sitemap.xml", { maxRedirects: 0 });
  expect(legacySitemapResponse.status()).toBe(308);
  expect(legacySitemapResponse.headers().location).toContain("/sitemap.xml");

  const faviconResponse = await request.get("/favicon.ico");
  expect(faviconResponse.ok()).toBeTruthy();
  expect(faviconResponse.headers()["content-type"] ?? "").toMatch(/image\/|icon/);
});

test("free claim tracker page and download asset are reachable", async ({ page, request }) => {
  await page.goto("/free-public-adjuster-claim-tracker");
  await expect(page.getByRole("heading", { name: "Free Public Adjuster Claim Tracker", exact: true })).toBeVisible();

  const downloadCta = page.getByRole("link", { name: "Download Free Tracker (CSV)", exact: true });
  await expect(downloadCta).toBeVisible();
  await expect(downloadCta).toHaveAttribute("href", "/downloads/public-adjuster-claim-tracker.csv");

  await expect(page.getByRole("link", { name: /Start free trial/i }).first()).toHaveAttribute("href", "/signup");

  const trackerCsvResponse = await request.get("/downloads/public-adjuster-claim-tracker.csv");
  expect(trackerCsvResponse.ok()).toBeTruthy();
  const trackerCsvText = await trackerCsvResponse.text();
  expect(trackerCsvText).toMatch(/Claim(\/Lead)? Name/);
  expect(trackerCsvText).toContain("Client Name");
});
