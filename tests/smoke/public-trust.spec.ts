import { expect, test } from "@playwright/test";

const trustPages = [
  { path: "/privacy", heading: "How AdjusterDesk handles information.", copy: "Information from workspace setup, demo, and contact requests" },
  { path: "/terms", heading: "Plain terms for using AdjusterDesk.", copy: "Professional judgment and advice" },
  { path: "/cookies", heading: "How AdjusterDesk uses cookies.", copy: "Strictly necessary cookies" },
  { path: "/accessibility", heading: "A practical commitment to accessible public pages.", copy: "Accessibility commitment" },
  { path: "/security", heading: "Practical security notes for AdjusterDesk.", copy: "What AdjusterDesk does not claim" },
];

const footerLinks = [
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
  { name: "Cookies", href: "/cookies" },
  { name: "Accessibility", href: "/accessibility" },
  { name: "Security", href: "/security" },
  { name: "Start using AdjusterDesk", href: "/signup" },
  { name: "Talk to us", href: "/demo" },
];

test("public trust pages render and footer links are available", async ({ page }) => {
  for (const trustPage of trustPages) {
    await page.goto(trustPage.path);
    await expect(page.getByRole("heading", { name: trustPage.heading, exact: true })).toBeVisible();
    await expect(page.getByText(trustPage.copy, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start using AdjusterDesk", exact: true }).first()).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("link", { name: "Talk to us", exact: true }).first()).toHaveAttribute("href", "/demo");
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
  expect(robotsText).toContain("Sitemap:");
  expect(robotsText).toContain("Disallow: /claims/");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemapText = await sitemapResponse.text();
  expect(sitemapText).toContain("/pricing");
  expect(sitemapText).toContain("/privacy");
  expect(sitemapText).toContain("/security");
  expect(sitemapText).not.toContain("/claims");
});
