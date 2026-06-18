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

async function openAccountMenu(page: Page, menuLabel: string) {
  await page.getByRole("button", { name: new RegExp(menuLabel, "i") }).click();
}

function accountMenu(page: Page) {
  return page.getByRole("banner");
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
  await openAccountMenu(page, "QA User");
  await expect(page.getByRole("link", { name: "System admin", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "System workspaces", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "System emails", exact: true })).toHaveCount(0);

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

  await page.goto("/system/outreach/new");
  await expect(page).not.toHaveURL(/\/system\/outreach\/new(?:\?|$)/);

  await page.goto("/system/outreach/test-prospect-id");
  await expect(page).not.toHaveURL(/\/system\/outreach\/test-prospect-id(?:\?|$)/);

  await page.goto("/system/outreach/playbook");
  await expect(page).not.toHaveURL(/\/system\/outreach\/playbook(?:\?|$)/);

  await page.goto("/system/outreach/candidates");
  await expect(page).not.toHaveURL(/\/system\/outreach\/candidates(?:\?|$)/);
});

test("admin QA user can access system admin pages", async ({ page }) => {
  test.skip(!qaAdminEmail || !qaAdminPassword, "Missing AD_QA_ADMIN_EMAIL or AD_QA_ADMIN_PASSWORD in .env.qa.local");

  await login(page, qaAdminEmail, qaAdminPassword);
  await openAccountMenu(page, "QA Admin");
  await expect(accountMenu(page).getByRole("link", { name: "System admin", exact: true })).toBeVisible();
  await expect(accountMenu(page).getByRole("link", { name: "System workspaces", exact: true })).toBeVisible();
  await expect(accountMenu(page).getByRole("link", { name: "Outreach tracker", exact: true })).toBeVisible();
  await expect(accountMenu(page).getByRole("link", { name: "System emails", exact: true })).toBeVisible();
  await expect(accountMenu(page).getByRole("link", { name: "Account settings", exact: true })).toBeVisible();
  await accountMenu(page).getByRole("link", { name: "System admin", exact: true }).click();
  await expect(page).toHaveURL(/\/system(?:\?|$)/);

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
  await expect(page.getByText("Outreach first email", { exact: true })).toBeVisible();
  await expect(page.getByText("Outreach follow-up", { exact: true })).toBeVisible();
  await scanPageText(page, "admin /system/emails");

  await page.goto("/system/outreach");
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "System outreach", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Outreach playbook", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Lead candidates", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add prospect", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite outreach operator", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Invite outreach operator", exact: true })).toHaveCount(0);
  await expect(page.locator('input[name="firmName"]')).toHaveCount(0);
  await expect(page.locator("table").first()).toBeVisible();
  await expect(page.getByLabel("View", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Sort", { exact: true })).toBeVisible();

  // Queue view tabs
  await page.goto("/system/outreach?view=today");
  await expect(page.getByLabel("View", { exact: true })).toBeVisible();
  await page.goto("/system/outreach?view=overdue");
  await expect(page.locator("table").first()).toBeVisible();
  await page.goto("/system/outreach?view=upcoming");
  await expect(page.locator("table").first()).toBeVisible();
  await page.goto("/system/outreach?view=all");
  await expect(page.locator("table").first()).toBeVisible();

  const qaFirmName = `QA Outreach Firm ${Date.now()}`;
  await page.goto("/system/outreach/new");
  await expect(page).toHaveURL(/\/system\/outreach\/new(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Add outreach prospect", exact: true })).toBeVisible();
  await page.locator('input[name="firmName"]').fill(qaFirmName);
  await page.locator('input[name="website"]').fill("https://example.com");
  await page.locator('input[name="state"]').fill("TX");
  await page.locator('input[name="contactName"]').fill("QA Contact");
  await page.locator('input[name="email"]').fill(`qa+${Date.now()}@example.com`);
  await page.locator('input[name="source"]').fill("Manual QA");
  await page.locator('textarea[name="notes"]').fill("Created by production QA smoke test");
  await page.getByRole("button", { name: "Add prospect", exact: true }).click();
  await expect(page).toHaveURL(/\/system\/outreach\?notice=system-outreach-created(?:&|$)/);
  await page.goto("/system/outreach?view=all");
  await expect(page).toHaveURL(/\/system\/outreach\?view=all(?:&|$)/);

  const rowLink = page.getByRole("link", { name: qaFirmName, exact: true }).first();
  await expect(rowLink).toBeVisible();
  await rowLink.click();
  await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+(?:\?|$)/);
  await expect(page.getByRole("button", { name: "Save updates", exact: true })).toBeVisible();
  // Next action summary
  await expect(page.getByText("Next action summary", { exact: true })).toBeVisible();
  await expect(page.getByText("Suggested action", { exact: false })).toBeVisible();
  await expect(page.getByText("Status helper", { exact: true })).toBeVisible();
  await expect(page.getByText("Copy-ready email drafts", { exact: true })).toBeVisible();
  await expect(page.getByText("These drafts do not send email.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for outreach", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark email sent", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark follow-up due", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark interested", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark trial created", exact: true })).toBeVisible();
  await expect(page.getByText("Outreach email send", { exact: true })).toBeVisible();
  await expect(page.getByText("Manual one-prospect send only.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Rendered subject", { exact: true })).toBeVisible();
  await expect(page.getByText("Rendered body preview", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send email", exact: true })).toBeVisible();
  await expect(page.locator('select[name="status"]')).toContainText("Ready for outreach");
  await expect(page.locator('select[name="status"]')).toContainText("Fit check scheduled");
  await expect(page.locator('select[name="status"]')).toContainText("Email 1 sent");

  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+\?templateKey=outreach_first_email&notice=system-outreach-email-sent(?:&|$)/);
  await expect(page.getByText("Outreach activity", { exact: true })).toBeVisible();
  await expect(page.getByText("SENT · EMAIL", { exact: true })).toBeVisible();

  await page.locator('textarea[name="notes"]').fill("Updated from QA detail page");
  await page.getByRole("button", { name: "Save updates", exact: true }).click();
  await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+\?notice=system-outreach-updated(?:&|$)/);

  const qaNoEmailFirmName = `QA Outreach No Email ${Date.now()}`;
  await page.goto("/system/outreach/new");
  await expect(page).toHaveURL(/\/system\/outreach\/new(?:\?|$)/);
  await page.locator('input[name="firmName"]').fill(qaNoEmailFirmName);
  await page.locator('input[name="website"]').fill("https://example.org");
  await page.locator('input[name="state"]').fill("FL");
  await page.locator('input[name="contactName"]').fill("No Email Contact");
  await page.getByRole("button", { name: "Add prospect", exact: true }).click();
  await expect(page).toHaveURL(/\/system\/outreach\?notice=system-outreach-created(?:&|$)/);
  await page.goto("/system/outreach?view=all");
  await expect(page).toHaveURL(/\/system\/outreach\?view=all(?:&|$)/);

  await page.getByRole("link", { name: qaNoEmailFirmName, exact: true }).first().click();
  await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+(?:\?|$)/);
  await expect(page.getByText("No public email on this prospect.", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Send email", exact: true })).toBeDisabled();

  await page.goto("/system/outreach/playbook");
  await expect(page).toHaveURL(/\/system\/outreach\/playbook(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "AdjusterDesk - Outreach Playbook", exact: true })).toBeVisible();

  // Candidate intake
  await page.goto("/system/outreach/candidates");
  await expect(page).toHaveURL(/\/system\/outreach\/candidates(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Lead candidates", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add candidate", exact: true })).toBeVisible();
  await expect(page.locator("table").first()).toBeVisible();

  const qaCandidateFirm = `QA Candidate Firm ${Date.now()}`;
  await page.goto("/system/outreach/candidates/new");
  await expect(page).toHaveURL(/\/system\/outreach\/candidates\/new(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Add lead candidate", exact: true })).toBeVisible();
  await page.locator('input[name="firmName"]').fill(qaCandidateFirm);
  await page.locator('input[name="website"]').fill(`https://qa-candidate-${Date.now()}.example.com`);
  await page.locator('input[name="state"]').fill("TX");
  await page.locator('input[name="contactName"]').fill("QA Candidate Contact");
  await page.locator('textarea[name="notes"]').fill("Created by QA smoke test");
  await page.getByRole("button", { name: "Add candidate", exact: true }).click();
  await expect(page).toHaveURL(/\/system\/outreach\/candidates\/[^/?#]+\?notice=candidate-created(?:&|$)/);
  await expect(page.getByText("Next action summary", { exact: false }).or(page.getByText("Save updates", { exact: true }))).toBeVisible();

  await expect(page.getByText("Promote to prospect", { exact: true })).toBeVisible();
  await expect(page.getByText("Reject candidate", { exact: true })).toBeVisible();

  // Promote candidate to prospect
  await page.getByRole("button", { name: "Promote to prospect", exact: true }).click();
  await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+\?notice=candidate-promoted(?:&|$)/);
  await expect(page.getByText("Next action summary", { exact: true })).toBeVisible();

  await scanPageText(page, "admin /system/outreach");
});

test("outreach operator can access outreach but not broader system admin", async ({ page }) => {
  test.skip(!qaOutreachEmail || !qaOutreachPassword, "Missing AD_QA_OUTREACH_EMAIL or AD_QA_OUTREACH_PASSWORD in .env.qa.local");

  await login(page, qaOutreachEmail, qaOutreachPassword);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
  await openAccountMenu(page, "QA Outreach Operator");
  await expect(accountMenu(page).getByRole("link", { name: "Outreach tracker", exact: true })).toBeVisible();
  await expect(accountMenu(page).getByRole("link", { name: "Account settings", exact: true })).toBeVisible();
  await expect(accountMenu(page).getByRole("link", { name: "System workspaces", exact: true })).toHaveCount(0);
  await expect(accountMenu(page).getByRole("link", { name: "System emails", exact: true })).toHaveCount(0);

  await page.goto("/system/outreach");
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /Outreach tracker|System outreach/, exact: false })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Outreach playbook", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Lead candidates", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite outreach operator", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add prospect", exact: true })).toBeVisible();
  await expect(page.locator("table").first()).toBeVisible();
  await expect(page.getByLabel("View", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Sort", { exact: true })).toBeVisible();

  // Queue views
  await page.goto("/system/outreach?view=overdue");
  await expect(page.locator("table").first()).toBeVisible();
  await page.goto("/system/outreach?view=upcoming");
  await expect(page.locator("table").first()).toBeVisible();

  await page.goto("/system/outreach/new");
  await expect(page).toHaveURL(/\/system\/outreach\/new(?:\?|$)/);

  await page.goto("/system/outreach");
  const firstProspectLink = page.locator('a[href^="/system/outreach/"]:not([href="/system/outreach/new"]):not([href="/system/outreach/playbook"]):not([href="/system/outreach/candidates"])').first();
  if (await firstProspectLink.count()) {
    await firstProspectLink.click();
    await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+(?:\?|$)/);
    await expect(page.getByRole("button", { name: "Save updates", exact: true })).toBeVisible();
    await expect(page.getByText("Next action summary", { exact: true })).toBeVisible();
    await expect(page.getByText("Outreach email send", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mark interested", exact: true }).click();
    await expect(page).toHaveURL(/\/system\/outreach\/[^/?#]+\?notice=system-outreach-updated(?:&|$)/);
  }

  // Candidate intake access for outreach operator
  await page.goto("/system/outreach/candidates");
  await expect(page).toHaveURL(/\/system\/outreach\/candidates(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Lead candidates", exact: true })).toBeVisible();

  await page.goto("/system/workspaces");
  await expect(page).not.toHaveURL(/\/system\/workspaces(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);

  await page.goto("/system/emails");
  await expect(page).not.toHaveURL(/\/system\/emails(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);

  await page.goto("/system");
  await expect(page).not.toHaveURL(/\/system(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);

  await page.goto("/system/users");
  await expect(page).not.toHaveURL(/\/system\/users(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
});

test("system admin can access /system/users and see user management actions", async ({ page }) => {
  test.skip(!qaAdminEmail || !qaAdminPassword, "Missing AD_QA_ADMIN_EMAIL or AD_QA_ADMIN_PASSWORD in .env.qa.local");

  await login(page, qaAdminEmail, qaAdminPassword);
  await page.goto("/system/users");
  await expect(page).toHaveURL(/\/system\/users(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "System users", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite outreach operator", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite outreach operator", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All users", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Name", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "System Admin", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Outreach Op", exact: true })).toBeVisible();
  await scanPageText(page, "admin /system/users");

  await openAccountMenu(page, "QA Admin");
  await expect(accountMenu(page).getByRole("link", { name: "System users", exact: true })).toBeVisible();
});

test("outreach operator cannot access /system/users", async ({ page }) => {
  test.skip(!qaOutreachEmail || !qaOutreachPassword, "Missing AD_QA_OUTREACH_EMAIL or AD_QA_OUTREACH_PASSWORD in .env.qa.local");

  await login(page, qaOutreachEmail, qaOutreachPassword);
  await page.goto("/system/users");
  await expect(page).not.toHaveURL(/\/system\/users(?:\?|$)/);
  await expect(page).toHaveURL(/\/system\/outreach(?:\?|$)/);
});

test("normal QA user cannot access /system/users", async ({ page }) => {
  test.skip(!qaUserEmail || !qaUserPassword, "Missing AD_QA_USER_EMAIL or AD_QA_USER_PASSWORD in .env.qa.local");

  await login(page, qaUserEmail, qaUserPassword);
  await page.goto("/system/users");
  await expect(page).not.toHaveURL(/\/system\/users(?:\?|$)/);
  await expect(page).not.toHaveURL(/\/system/);

  await page.goto("/system/outreach");
  await expect(page).not.toHaveURL(/\/system\/outreach(?:\?|$)/);

  await page.goto("/system/outreach/new");
  await expect(page).not.toHaveURL(/\/system\/outreach\/new(?:\?|$)/);

  await page.goto("/system/outreach/test-prospect-id");
  await expect(page).not.toHaveURL(/\/system\/outreach\/test-prospect-id(?:\?|$)/);

  await page.goto("/system/outreach/playbook");
  await expect(page).not.toHaveURL(/\/system\/outreach\/playbook(?:\?|$)/);

  await page.goto("/system/outreach/candidates");
  await expect(page).not.toHaveURL(/\/system\/outreach\/candidates(?:\?|$)/);
});
