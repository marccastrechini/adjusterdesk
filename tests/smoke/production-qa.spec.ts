import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadQaEnv() {
  const qaEnvPath = path.join(process.cwd(), ".env.qa.local");
  if (!existsSync(qaEnvPath)) {
    return;
  }

  const lines = readFileSync(qaEnvPath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadQaEnv();

const baseURL = process.env.AD_QA_BASE_URL?.trim() || "https://adjusterdesk.xyz";
const qaUserEmail = process.env.AD_QA_USER_EMAIL?.trim() || "";
const qaUserPassword = process.env.AD_QA_USER_PASSWORD?.trim() || "";
const qaAdminEmail = process.env.AD_QA_ADMIN_EMAIL?.trim() || "";
const qaAdminPassword = process.env.AD_QA_ADMIN_PASSWORD?.trim() || "";
const qaOutreachEmail = process.env.AD_QA_OUTREACH_EMAIL?.trim() || "";
const qaOutreachPassword = process.env.AD_QA_OUTREACH_PASSWORD?.trim() || "";
const qaOutreachInviteName = process.env.AD_QA_OUTREACH_INVITE_NAME?.trim() || "QA Outreach Operator";

test.use({ baseURL });

const bannedTerms: Array<{ label: string; regex: RegExp }> = [
  { label: "pilot", regex: /\bpilot\b/i },
  { label: "beta", regex: /\bbeta\b/i },
  { label: "mvp", regex: /\bmvp\b/i },
  { label: "demo reset", regex: /demo reset/i },
  { label: "reset demo", regex: /reset demo/i },
  { label: "demo data", regex: /demo data/i },
  { label: "test data", regex: /test data/i },
  { label: "fake", regex: /\bfake\b/i },
  { label: "placeholder", regex: /\bplaceholder\b/i },
  { label: "todo", regex: /\btodo\b/i },
  { label: "staging", regex: /\bstaging\b/i },
  { label: "internal only", regex: /internal only/i },
  { label: "for testing", regex: /for testing/i },
  { label: "rehearsal", regex: /\brehearsal\b/i },
];

async function scanPageText(page: Page, pageLabel: string) {
  const bodyText = await page.evaluate(() => document.body.innerText || "");
  const hits = bannedTerms.filter((term) => term.regex.test(bodyText)).map((term) => term.label);

  if (hits.length > 0) {
    test.info().annotations.push({
      type: "copy-warning",
      description: `${pageLabel}: ${hits.join(", ")}`,
    });
    console.warn(`Non-blocking copy warning on ${pageLabel}: ${hits.join(", ")}`);
  }

  expect(bodyText).not.toMatch(/internal server error|application error|stack trace|unhandled runtime error/i);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(today|start|claims|leads|settings|system\/outreach)(?:\?|$)/);
}

async function getFirstClaimPath(page: Page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((node) => (node as HTMLAnchorElement).getAttribute("href") || "")
      .filter((href) => /^\/claims\/[^/?#]+$/.test(href));

    return links[0] || null;
  });
}

test("production public pages load and primary routes are healthy", async ({ page }) => {
  const publicPaths = ["/", "/login", "/forgot-password", "/pricing", "/privacy", "/terms", "/cookies", "/accessibility", "/security", "/demo"];

  for (const route of publicPaths) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route === "/" ? "\\/$" : route.replace("/", "\\/")}(?:\\?|$)`));
    await scanPageText(page, `public ${route}`);
  }

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start free trial" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Talk to us" }).first()).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("link", { name: "Log in" }).first()).toHaveAttribute("href", "/login");

  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
  await expect(footer.getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", "/terms");
  await expect(footer.getByRole("link", { name: "Cookies", exact: true })).toHaveAttribute("href", "/cookies");
  await expect(footer.getByRole("link", { name: "Accessibility", exact: true })).toHaveAttribute("href", "/accessibility");
  await expect(footer.getByRole("link", { name: "Security", exact: true })).toHaveAttribute("href", "/security");
});

test("normal QA user can access office pages and cannot access system admin tools", async ({ page }) => {
  test.skip(!qaUserEmail || !qaUserPassword, "Missing AD_QA_USER_EMAIL or AD_QA_USER_PASSWORD in .env.qa.local");

  await login(page, qaUserEmail, qaUserPassword);

  const standardRoutes = ["/today", "/start", "/leads", "/claims", "/office-resources", "/settings", "/settings/templates", "/money", "/reports"];
  for (const route of standardRoutes) {
    await page.goto(route);
    await scanPageText(page, `normal user ${route}`);
  }

  await page.goto("/claims");
  const claimPath = await getFirstClaimPath(page);
  if (claimPath) {
    await page.goto(claimPath);
    await scanPageText(page, `normal user ${claimPath}`);

    await page.goto(`${claimPath}/documents`);
    await scanPageText(page, `normal user ${claimPath}/documents`);

    await page.goto(`${claimPath}/client-status`);
    await scanPageText(page, `normal user ${claimPath}/client-status`);

    await page.goto(`${claimPath}/tasks`);
    await scanPageText(page, `normal user ${claimPath}/tasks`);
  }

  await page.goto("/start");
  await expect(page.getByRole("heading", { name: "First 5 minutes", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Add first claim|Review claims/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Today", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Money/ }).first()).toBeVisible();
  const startText = await page.evaluate(() => document.body.innerText || "");
  expect(startText).not.toMatch(/demo reset|reset demo|npm run demo:reset:local|seed\s*\/\s*reset/i);

  await page.goto("/system");
  await expect(page).not.toHaveURL(/\/system(?:\?|$)/);
  await expect(page.locator('a[href^="/system"]')).toHaveCount(0);

  await page.goto("/system/outreach");
  await expect(page).not.toHaveURL(/\/system\/outreach(?:\?|$)/);
});

test("admin QA user can access system admin pages", async ({ page }) => {
  test.skip(!qaAdminEmail || !qaAdminPassword, "Missing AD_QA_ADMIN_EMAIL or AD_QA_ADMIN_PASSWORD in .env.qa.local");

  await login(page, qaAdminEmail, qaAdminPassword);

  await page.goto("/system");
  await expect(page).toHaveURL(/\/system(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "System admin", exact: true })).toBeVisible();
  await scanPageText(page, "admin /system");

  await page.goto("/system/workspaces");
  await expect(page).toHaveURL(/\/system\/workspaces(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "System workspaces", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activation visibility", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Workspace", exact: true })).toBeVisible();

  await page.goto("/system/emails");
  await expect(page).toHaveURL(/\/system\/emails(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "System emails", exact: true })).toBeVisible();
  await scanPageText(page, "admin /system/emails");

  await page.goto("/system/outreach");
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "System outreach", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite outreach operator", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite outreach operator", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add outreach prospect", exact: true })).toBeVisible();

  if (qaOutreachEmail) {
    await page.locator('input[name="name"]').first().fill(qaOutreachInviteName);
    await page.locator('input[name="email"]').first().fill(qaOutreachEmail);
    await page.locator('input[name="note"]').first().fill("Production QA outreach invite path check");
    await page.getByRole("button", { name: "Invite outreach operator", exact: true }).click();
    await expect(page).toHaveURL(/\/system\/outreach\?notice=system-outreach-operator-invite-(created|updated)(?:&|$)/);
  }

  await scanPageText(page, "admin /system/outreach");
});

test("outreach operator can access outreach but not broader system admin", async ({ page }) => {
  test.skip(!qaOutreachEmail || !qaOutreachPassword, "Missing AD_QA_OUTREACH_EMAIL or AD_QA_OUTREACH_PASSWORD in .env.qa.local");

  await login(page, qaOutreachEmail, qaOutreachPassword);

  await page.goto("/system/outreach");
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /Outreach tracker|System outreach/, exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite outreach operator", exact: true })).toHaveCount(0);

  await page.goto("/system/workspaces");
  await expect(page).not.toHaveURL(/\/system\/workspaces(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);

  await page.goto("/system/emails");
  await expect(page).not.toHaveURL(/\/system\/emails(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);

  await page.goto("/system");
  await expect(page).not.toHaveURL(/\/system(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
});
