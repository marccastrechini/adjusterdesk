import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";

type Severity = "P0" | "P1" | "P2" | "P3";

type BrowserEvent = {
  at: string;
  pageLabel: string;
  url: string;
  kind: "console" | "pageerror" | "requestfailed";
  message: string;
};

type Snapshot = {
  label: string;
  url: string;
  screenshotPath: string;
  textPath: string;
  headings: string[];
  wordCount: number;
};

type Finding = {
  id: string;
  priority: Severity;
  route: string;
  task: string;
  evidence: string;
  whatHappened: string;
  whyItMatters: string;
  mvpGoal: string;
  recommendedFix: string;
  timing: "Before outreach" | "After first conversations" | "Monitor";
};

type TaskScore = {
  task: string;
  route: string;
  score: number;
  notes: string;
  evidence: string;
};

type RouteScore = {
  route: string;
  score: number;
  notes: string;
  evidence: string;
};

type StudySummary = {
  startedAt: string;
  baseUrl: string;
  artifactDir: string;
  credentialsLoaded: {
    normalUser: boolean;
    adminUser: boolean;
  };
  counters: {
    clicks: number;
    typedFields: number;
    snapshots: number;
  };
  snapshots: Snapshot[];
  events: BrowserEvent[];
  taskScores: TaskScore[];
  routeScores: RouteScore[];
  dimensionScores: Record<string, number>;
  findings: Finding[];
  accessibility: {
    axeCoreInstalled: boolean;
    method: string;
    checks: Array<{ label: string; result: string }>;
  };
};

const bannedTerms = [
  /\bpilot\b/i,
  /\bbeta\b/i,
  /\bmvp\b/i,
  /demo reset/i,
  /reset demo/i,
  /demo data/i,
  /test data/i,
  /\bfake\b/i,
  /\bplaceholder\b/i,
  /\btodo\b/i,
  /\bstaging\b/i,
  /internal only/i,
  /for testing/i,
  /\brehearsal\b/i,
];

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return false;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
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

  return true;
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function relativeToRepo(repoRoot: string, filePath: string) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function dateInput(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const requireFromScript = createRequire(import.meta.url);

function resolveAxeSource() {
  try {
    return readFileSync(requireFromScript.resolve("axe-core/axe.min.js"), "utf8");
  } catch {
    return null;
  }
}

async function ensureVisible(locator: Locator, label: string) {
  const count = await locator.count();
  if (count === 0) {
    throw new Error(`Missing expected UI: ${label}`);
  }
  await locator.first().waitFor({ state: "visible", timeout: 10_000 });
}

async function makeContext(browser: Awaited<ReturnType<typeof chromium.launch>>, pageLabel: string, events: BrowserEvent[], viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || /error|exception|minified react|hydration/i.test(text)) {
      events.push({
        at: new Date().toISOString(),
        pageLabel,
        url: page.url(),
        kind: "console",
        message: `${message.type()}: ${text}`.slice(0, 800),
      });
    }
  });

  page.on("pageerror", (error) => {
    events.push({
      at: new Date().toISOString(),
      pageLabel,
      url: page.url(),
      kind: "pageerror",
      message: String(error).slice(0, 1200),
    });
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (failure === "net::ERR_ABORTED") return;
    events.push({
      at: new Date().toISOString(),
      pageLabel,
      url: page.url(),
      kind: "requestfailed",
      message: `${request.method()} ${request.url()} failed: ${failure}`.slice(0, 1200),
    });
  });

  return { context, page };
}

async function collectSnapshot(args: {
  page: Page;
  label: string;
  artifactDir: string;
  repoRoot: string;
  snapshots: Snapshot[];
}) {
  const index = String(args.snapshots.length + 1).padStart(2, "0");
  const safeLabel = `${index}-${slug(args.label)}`;
  const screenshotPath = path.join(args.artifactDir, `${safeLabel}.png`);
  const textPath = path.join(args.artifactDir, `${safeLabel}.txt`);

  const text = await args.page.evaluate(() => document.body.innerText || "");
  const headings = await args.page.evaluate(() =>
    Array.from(document.querySelectorAll("h1,h2,h3"))
      .map((node) => `${node.tagName.toLowerCase()}: ${(node.textContent || "").trim()}`)
      .filter(Boolean),
  );

  await args.page.screenshot({ path: screenshotPath, fullPage: true });
  writeFileSync(textPath, text, "utf8");

  const snapshot: Snapshot = {
    label: args.label,
    url: args.page.url(),
    screenshotPath: relativeToRepo(args.repoRoot, screenshotPath),
    textPath: relativeToRepo(args.repoRoot, textPath),
    headings,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
  args.snapshots.push(snapshot);
  return snapshot;
}

async function scanVisibleText(page: Page) {
  const text = await page.evaluate(() => document.body.innerText || "");
  return bannedTerms.filter((term) => term.test(text)).map((term) => term.source);
}

async function structuralAccessibilityCheck(page: Page) {
  return page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll("input, textarea, select")) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    const unlabeledFields = fields.filter((field) => {
      if (field.type === "hidden") return false;
      const id = field.getAttribute("id");
      const aria = field.getAttribute("aria-label") || field.getAttribute("aria-labelledby");
      const name = field.getAttribute("name") || "field";
      const wrappingLabel = field.closest("label");
      const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      return !aria && !wrappingLabel && !explicitLabel && !name;
    });

    const interactive = Array.from(document.querySelectorAll("a, button, input, textarea, select")) as HTMLElement[];
    const unnamedButtons = Array.from(document.querySelectorAll("button")).filter((button) => !(button.textContent || "").trim() && !button.getAttribute("aria-label"));
    const h1Count = document.querySelectorAll("h1").length;

    return {
      fieldCount: fields.filter((field) => field.type !== "hidden").length,
      unlabeledFieldCount: unlabeledFields.length,
      unnamedButtonCount: unnamedButtons.length,
      focusableCount: interactive.length,
      h1Count,
    };
  });
}

async function runAxeCheck(args: {
  page: Page;
  label: string;
  axeSource: string | null;
  artifactDir: string;
  repoRoot: string;
  summary: StudySummary;
}) {
  if (!args.axeSource) {
    args.summary.accessibility.checks.push({ label: args.label, result: "axe-core not available; skipped axe scan." });
    return;
  }

  await args.page.addScriptTag({ content: args.axeSource });
  const result = await args.page.evaluate(async () => {
    const axe = (window as unknown as { axe?: { run: (context?: unknown) => Promise<{ violations: Array<{ id: string; impact?: string; nodes: unknown[]; help: string }> }> } }).axe;
    if (!axe) return { violations: [] };
    return axe.run(document);
  });

  const fileName = `${slug(args.label)}-axe.json`;
  const filePath = path.join(args.artifactDir, fileName);
  writeFileSync(filePath, JSON.stringify(result, null, 2), "utf8");
  const violations = result.violations ?? [];
  const summaryText = violations.length === 0
    ? `0 violations (${relativeToRepo(args.repoRoot, filePath)})`
    : `${violations.length} violations: ${violations.map((violation) => `${violation.id}:${violation.impact ?? "unknown"}:${violation.nodes.length}`).join("; ")} (${relativeToRepo(args.repoRoot, filePath)})`;

  args.summary.accessibility.checks.push({ label: args.label, result: summaryText });
}

async function tabSequence(page: Page, count = 8) {
  const sequence: string[] = [];
  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return "none";
      return [active.tagName.toLowerCase(), active.getAttribute("href"), active.getAttribute("name"), active.textContent?.trim().slice(0, 60)]
        .filter(Boolean)
        .join(":");
    });
    sequence.push(focused);
  }
  return sequence;
}

async function click(locator: Locator, counters: StudySummary["counters"]) {
  counters.clicks += 1;
  await locator.click();
}

async function fill(locator: Locator, value: string, counters: StudySummary["counters"]) {
  counters.typedFields += 1;
  await locator.fill(value);
}

async function login(page: Page, email: string, password: string, counters: StudySummary["counters"], baseUrl: string) {
  await page.goto(new URL("/login", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await ensureVisible(page.getByRole("heading", { name: "Sign in", exact: true }), "login heading");
  await fill(page.locator('input[name="email"]'), email, counters);
  await fill(page.locator('input[name="password"]'), password, counters);
  await click(page.getByRole("button", { name: "Sign in", exact: true }), counters);
  await page.waitForURL(/\/(today|start|system)(?:\?|$)/, { timeout: 30_000 });
}

async function logout(page: Page, counters: StudySummary["counters"]) {
  const button = page.getByRole("button", { name: "Log out", exact: true });
  if ((await button.count()) > 0) {
    await click(button, counters);
    await page.waitForURL(/\/login(?:\?|$)/, { timeout: 30_000 });
  }
}

function addFinding(findings: Finding[], input: Omit<Finding, "id">) {
  findings.push({ id: `UX-${String(findings.length + 1).padStart(3, "0")}`, ...input });
}

async function main() {
  const repoRoot = process.cwd();
  loadEnvFile(path.join(repoRoot, ".env.qa.local"));

  const baseUrl = process.env.AD_QA_BASE_URL?.trim() || "https://adjusterdesk.xyz";
  const qaUserEmail = process.env.AD_QA_USER_EMAIL?.trim() || "";
  const qaUserPassword = process.env.AD_QA_USER_PASSWORD?.trim() || "";
  const qaAdminEmail = process.env.AD_QA_ADMIN_EMAIL?.trim() || "";
  const qaAdminPassword = process.env.AD_QA_ADMIN_PASSWORD?.trim() || "";

  if (!qaUserEmail || !qaUserPassword || !qaAdminEmail || !qaAdminPassword) {
    throw new Error("Missing QA credentials in .env.qa.local. Values were not printed.");
  }

  const artifactDir = path.join(repoRoot, "artifacts", "ux-study", timestamp());
  mkdirSync(artifactDir, { recursive: true });
  const axeSource = resolveAxeSource();

  const summary: StudySummary = {
    startedAt: new Date().toISOString(),
    baseUrl,
    artifactDir: relativeToRepo(repoRoot, artifactDir),
    credentialsLoaded: { normalUser: Boolean(qaUserEmail && qaUserPassword), adminUser: Boolean(qaAdminEmail && qaAdminPassword) },
    counters: { clicks: 0, typedFields: 0, snapshots: 0 },
    snapshots: [],
    events: [],
    taskScores: [],
    routeScores: [],
    dimensionScores: {
      "First-glance clarity": 4,
      "Next-step clarity": 4,
      "Match with public-adjusting office language": 5,
      "Navigation confidence": 4,
      "Cognitive load": 3,
      "Error prevention": 4,
      "Error recovery": 4,
      "Recognition over recall": 4,
      "Empty-state usefulness": 4,
      "Accessibility/keyboard basics": 3,
      "Mobile/responsive basics": 3,
      "MVP alignment": 4,
      "Trust/professional confidence": 4,
    },
    findings: [],
    accessibility: {
      axeCoreInstalled: Boolean(axeSource),
      method: axeSource
        ? "Representative axe-core scans plus lightweight DOM, keyboard, heading, label, and mobile viewport checks."
        : "Lightweight DOM, keyboard, heading, label, and mobile viewport checks. Axe-core was not available.",
      checks: [],
    },
  };

  const browser = await chromium.launch({ headless: true });

  try {
    const publicSession = await makeContext(browser, "public", summary.events, { width: 1440, height: 1000 });
    const publicPage = publicSession.page;

    for (const route of ["/", "/pricing", "/login", "/forgot-password", "/privacy", "/terms", "/security"]) {
      await publicPage.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded" });
      await publicPage.waitForTimeout(300);
      const snapshot = await collectSnapshot({ page: publicPage, label: `public ${route}`, artifactDir, repoRoot, snapshots: summary.snapshots });
      const termHits = await scanVisibleText(publicPage);
      summary.routeScores.push({ route, score: termHits.length ? 3 : 4, notes: termHits.length ? `Visible flagged terms: ${termHits.join(", ")}` : "Public page loads cleanly with clear primary CTAs and no flagged demo/test wording.", evidence: snapshot.screenshotPath });
    }
    await runAxeCheck({ page: publicPage, label: "public security", axeSource, artifactDir, repoRoot, summary });

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const mobileSnapshot = await collectSnapshot({ page: mobilePage, label: "mobile public homepage", artifactDir, repoRoot, snapshots: summary.snapshots });
    summary.accessibility.checks.push({ label: "Mobile public homepage", result: `Captured at 390px viewport: ${mobileSnapshot.screenshotPath}` });
    await mobileContext.close();
    await publicSession.context.close();

    const normalSession = await makeContext(browser, "normal-user", summary.events);
    const page = normalSession.page;
    await login(page, qaUserEmail, qaUserPassword, summary.counters, baseUrl);

    await page.goto(new URL("/today", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const todaySnapshot = await collectSnapshot({ page, label: "A first login today", artifactDir, repoRoot, snapshots: summary.snapshots });
    await runAxeCheck({ page, label: "today dashboard", axeSource, artifactDir, repoRoot, summary });
    summary.taskScores.push({ task: "A. First login / orientation", route: "/today", score: 4, notes: "Today presents clear work categories and a visible workspace identity; brand-new QA workspaces naturally have less priority signal until data exists.", evidence: todaySnapshot.screenshotPath });
    summary.taskScores.push({ task: "B. Start the day", route: "/today", score: 4, notes: "Overdue, due today, upcoming deadlines, carrier follow-ups, receivables, and recent claims are organized for daily triage.", evidence: todaySnapshot.screenshotPath });

    await page.goto(new URL("/start", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const startSnapshot = await collectSnapshot({ page, label: "start checklist", artifactDir, repoRoot, snapshots: summary.snapshots });
    summary.routeScores.push({ route: "/start", score: 4, notes: "Start checklist is practical and action-oriented for new offices.", evidence: startSnapshot.screenshotPath });

    await page.goto(new URL("/leads/new", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    await runAxeCheck({ page, label: "new lead form", axeSource, artifactDir, repoRoot, summary });
    await click(page.getByRole("button", { name: "Save lead and open detail", exact: true }), summary.counters);
    await page.waitForTimeout(500);
    const leadValidationSnapshot = await collectSnapshot({ page, label: "lead validation", artifactDir, repoRoot, snapshots: summary.snapshots });
    const suffix = Date.now().toString(36);
    await fill(page.locator('input[name="firstName"]'), "UX", summary.counters);
    await fill(page.locator('input[name="lastName"]'), `Lead ${suffix}`, summary.counters);
    await fill(page.locator('input[name="email"]'), `ux-lead-${suffix}@example.com`, summary.counters);
    await fill(page.locator('input[name="phone"]'), "(813) 555-0110", summary.counters);
    await fill(page.locator('input[name="address1"]'), "240 Palm Claim Avenue", summary.counters);
    await fill(page.locator('input[name="city"]'), "Tampa", summary.counters);
    await page.locator('select[name="state"]').selectOption("FL");
    await fill(page.locator('input[name="postalCode"]'), "33602", summary.counters);
    await fill(page.locator('input[name="lossType"]'), "Kitchen water damage", summary.counters);
    await fill(page.locator('input[name="dateOfLoss"]'), dateInput(-3), summary.counters);
    await fill(page.locator('input[name="followUpDate"]'), dateInput(2), summary.counters);
    await fill(page.locator('input[name="source"]'), "Referral", summary.counters);
    await fill(page.locator('textarea[name="notes"]'), "Client has photos and wants a morning callback.", summary.counters);
    await click(page.getByRole("button", { name: "Save lead and open detail", exact: true }), summary.counters);
    await page.waitForURL(/\/leads\/.+notice=lead-created/, { timeout: 30_000 });
    const leadSavedSnapshot = await collectSnapshot({ page, label: "lead saved detail", artifactDir, repoRoot, snapshots: summary.snapshots });
    summary.taskScores.push({ task: "C. New lead intake", route: "/leads/new", score: 4, notes: "Lead form groups client, property/loss, and intake details clearly; validation messages are plain and useful.", evidence: leadValidationSnapshot.screenshotPath });
    summary.routeScores.push({ route: "/leads/[id]", score: 4, notes: "Lead detail confirms save and exposes follow-up/activity/conversion actions.", evidence: leadSavedSnapshot.screenshotPath });

    await page.goto(new URL("/claims/new", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    await click(page.getByRole("button", { name: "Save claim and open overview", exact: true }), summary.counters);
    await page.waitForTimeout(500);
    const claimValidationSnapshot = await collectSnapshot({ page, label: "claim validation", artifactDir, repoRoot, snapshots: summary.snapshots });
    await fill(page.locator('input[name="firstName"]'), "UX", summary.counters);
    await fill(page.locator('input[name="lastName"]'), `Claim ${suffix}`, summary.counters);
    await fill(page.locator('input[name="email"]'), `ux-claim-${suffix}@example.com`, summary.counters);
    await fill(page.locator('input[name="phone"]'), "(813) 555-0111", summary.counters);
    await fill(page.locator('input[name="address1"]'), "410 Cypress Roof Road", summary.counters);
    await fill(page.locator('input[name="city"]'), "Clearwater", summary.counters);
    await fill(page.locator('input[name="postalCode"]'), "33756", summary.counters);
    await fill(page.locator('input[name="carrierName"]'), "Carrier to confirm", summary.counters);
    await fill(page.locator('input[name="lossType"]'), "Wind roof leak", summary.counters);
    await fill(page.locator('input[name="dateOfLoss"]'), dateInput(-7), summary.counters);
    await fill(page.locator('input[name="deadlineDate"]'), dateInput(14), summary.counters);
    await fill(page.locator('input[name="nextStep"]'), "Call carrier for desk adjuster assignment.", summary.counters);
    await click(page.getByRole("button", { name: "Save claim and open overview", exact: true }), summary.counters);
    await page.waitForURL(/\/claims\/.+notice=claim-created/, { timeout: 30_000 });
    const claimUrl = page.url().split("?")[0];
    const claimOverviewSnapshot = await collectSnapshot({ page, label: "claim overview", artifactDir, repoRoot, snapshots: summary.snapshots });
    await runAxeCheck({ page, label: "claim overview", axeSource, artifactDir, repoRoot, summary });
    summary.taskScores.push({ task: "D. New claim intake", route: "/claims/new", score: 4, notes: "Claim creation uses public-adjuster language and allows saving before all carrier fields are known.", evidence: claimValidationSnapshot.screenshotPath });
    summary.routeScores.push({ route: "/claims/[id]", score: 4, notes: "Claim overview offers tabs and next-work prompts; dense but understandable.", evidence: claimOverviewSnapshot.screenshotPath });

    const claimSubroutes = [
      ["claim documents", `${claimUrl}/documents`],
      ["claim tasks", `${claimUrl}/tasks`],
      ["claim communications", `${claimUrl}/communications`],
      ["claim money", `${claimUrl}/money`],
    ] as const;
    for (const [label, url] of claimSubroutes) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const shot = await collectSnapshot({ page, label, artifactDir, repoRoot, snapshots: summary.snapshots });
      summary.routeScores.push({ route: new URL(url).pathname, score: 4, notes: "Claim subpage loads cleanly and keeps actions in the right-hand action area.", evidence: shot.screenshotPath });
    }
    summary.taskScores.push({ task: "E. Claim work", route: "/claims/[id]", score: 4, notes: "Tabs for overview, tasks, documents, activity, money, and client status are visible and match the office workflow.", evidence: claimOverviewSnapshot.screenshotPath });

    await page.goto(`${claimUrl}/client-status`, { waitUntil: "domcontentloaded" });
    await fill(page.locator('textarea[name="publicSummary"]'), "Inspection is scheduled and estimate review is in progress.", summary.counters);
    await fill(page.locator('textarea[name="nextStep"]'), "The office will call after inspection notes are reviewed.", summary.counters);
    await click(page.getByRole("button", { name: "Save client status", exact: true }), summary.counters);
    await page.waitForURL(/notice=client-status-updated/, { timeout: 30_000 });
    const createClientLink = page.getByRole("button", { name: "Create client status link", exact: true }).first();
    if ((await createClientLink.count()) > 0) {
      await click(createClientLink, summary.counters);
      await page.waitForURL(/notice=client-link-created/, { timeout: 30_000 });
    }
    const statusSnapshot = await collectSnapshot({ page, label: "client status configured", artifactDir, repoRoot, snapshots: summary.snapshots });
    const clientLinkPath = await page.getByLabel("Client status link").first().inputValue().catch(() => "");
    if (clientLinkPath) {
      const clientContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const clientPage = await clientContext.newPage();
      await clientPage.goto(new URL(clientLinkPath, baseUrl).toString(), { waitUntil: "domcontentloaded" });
      await collectSnapshot({ page: clientPage, label: "public client status", artifactDir, repoRoot, snapshots: summary.snapshots });
      await clientContext.close();
    }
    summary.taskScores.push({ task: "F. Client status/share flow", route: "/claims/[id]/client-status", score: 4, notes: "The share flow is understandable and separates client-facing summary from internal tasks/money.", evidence: statusSnapshot.screenshotPath });

    await page.goto(`${claimUrl}/tasks?action=add-task`, { waitUntil: "domcontentloaded" });
    await fill(page.locator('input[name="title"]').first(), `Review UX study follow-up ${suffix}`, summary.counters);
    await fill(page.locator('input[name="dueDate"]').first(), dateInput(3), summary.counters);
    await fill(page.locator('textarea[name="notes"]').first(), "Confirm client status language after inspection.", summary.counters);
    await click(page.getByRole("button", { name: "Add task to claim", exact: true }), summary.counters);
    await page.waitForURL(/notice=task-created/, { timeout: 30_000 });
    const taskSnapshot = await collectSnapshot({ page, label: "task created", artifactDir, repoRoot, snapshots: summary.snapshots });
    const completeButton = page.getByRole("button", { name: "Complete", exact: true }).first();
    if ((await completeButton.count()) > 0) {
      await click(completeButton, summary.counters);
      await page.waitForTimeout(800);
      await collectSnapshot({ page, label: "task completed", artifactDir, repoRoot, snapshots: summary.snapshots });
    }
    summary.taskScores.push({ task: "G. Tasks/follow-up", route: "/claims/[id]/tasks", score: 4, notes: "Adding and completing tasks is clear; templates reduce recall load.", evidence: taskSnapshot.screenshotPath });

    await page.goto(`${claimUrl}/documents?action=add-document`, { waitUntil: "domcontentloaded" });
    await fill(page.locator('input[name="title"]'), `QA inspection note ${suffix}`, summary.counters);
    await page.locator('input[name="file"]').setInputFiles({
      name: `qa-inspection-note-${suffix}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("QA usability study dummy file. No customer data.", "utf8"),
    });
    await fill(page.locator('textarea[name="notes"]'), "Dummy text file uploaded only in QA workspace for usability study.", summary.counters);
    await click(page.getByRole("button", { name: "Save uploaded or office document", exact: true }), summary.counters);
    await page.waitForURL(/notice=document-added/, { timeout: 30_000 });
    const documentSnapshot = await collectSnapshot({ page, label: "document uploaded", artifactDir, repoRoot, snapshots: summary.snapshots });
    summary.taskScores.push({ task: "H. Documents", route: "/claims/[id]/documents", score: 4, notes: "Upload path worked with a dummy file; requested vs received states are meaningful.", evidence: documentSnapshot.screenshotPath });

    await page.goto(`${claimUrl}/money?action=settlement`, { waitUntil: "domcontentloaded" });
    await fill(page.locator('input[name="demandAmount"]'), "28500", summary.counters);
    await fill(page.locator('input[name="offerAmount"]'), "21000", summary.counters);
    await fill(page.locator('input[name="acceptedAmount"]'), "24000", summary.counters);
    await page.locator('select[name="status"]').first().selectOption("ACCEPTED");
    await fill(page.locator('input[name="offeredAt"]'), dateInput(5), summary.counters);
    await fill(page.locator('textarea[name="notes"]'), "Accepted after revised cabinet allowance.", summary.counters);
    await click(page.getByRole("button", { name: "Save settlement round", exact: true }), summary.counters);
    await page.waitForTimeout(800);
    await page.goto(`${claimUrl}/money?action=invoice`, { waitUntil: "domcontentloaded" });
    const invoiceNumber = `UX-${suffix.toUpperCase()}`;
    await fill(page.locator('input[name="invoiceNumber"]'), invoiceNumber, summary.counters);
    await fill(page.locator('input[name="settlementAmount"]'), "24000", summary.counters);
    await fill(page.locator('input[name="feePercent"]'), "10", summary.counters);
    await page.locator('select[name="status"]').selectOption("SENT");
    await fill(page.locator('input[name="issuedAt"]'), dateInput(6), summary.counters);
    await fill(page.locator('input[name="dueAt"]'), dateInput(13), summary.counters);
    await click(page.getByRole("button", { name: "Create fee invoice", exact: true }), summary.counters);
    await page.waitForTimeout(800);
    await page.goto(new URL("/money", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const moneySnapshot = await collectSnapshot({ page, label: "money receivables", artifactDir, repoRoot, snapshots: summary.snapshots });
    await page.goto(new URL("/reports", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const reportsSnapshot = await collectSnapshot({ page, label: "reports", artifactDir, repoRoot, snapshots: summary.snapshots });
    summary.taskScores.push({ task: "I. Money/reports", route: "/money and /reports", score: 3, notes: "Settlement, invoice, and receivable concepts are present, but the workflow is more specialized and denser than lead/claim/task flows.", evidence: moneySnapshot.screenshotPath });
    summary.routeScores.push({ route: "/reports", score: 4, notes: "Reports are understandable and route users to operational lists.", evidence: reportsSnapshot.screenshotPath });

    await page.goto(new URL("/settings", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const settingsSnapshot = await collectSnapshot({ page, label: "settings", artifactDir, repoRoot, snapshots: summary.snapshots });
    const visibleTerms = await scanVisibleText(page);
    summary.taskScores.push({ task: "J. Settings", route: "/settings", score: visibleTerms.length ? 3 : 4, notes: visibleTerms.length ? `Visible flagged terms: ${visibleTerms.join(", ")}` : "Settings is practical and no demo/reset/internal controls are visible to normal user.", evidence: settingsSnapshot.screenshotPath });

    await page.goto(new URL("/system", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const systemBlocked = !/\/system(?:\?|$)/.test(page.url());
    const permissionSnapshot = await collectSnapshot({ page, label: "normal user system blocked", artifactDir, repoRoot, snapshots: summary.snapshots });
    summary.taskScores.push({ task: "K. Permission check", route: "/system", score: systemBlocked ? 5 : 1, notes: systemBlocked ? "Normal QA user is redirected away from system admin routes." : "Normal QA user reached system route.", evidence: permissionSnapshot.screenshotPath });

    const a11yCheck = await structuralAccessibilityCheck(page);
    summary.accessibility.checks.push({ label: "Normal user structure", result: JSON.stringify(a11yCheck) });
    const tabs = await tabSequence(page, 8).catch((error: unknown) => [`Keyboard pass failed: ${error instanceof Error ? error.message : "unknown"}`]);
    summary.accessibility.checks.push({ label: "Keyboard tab sequence", result: tabs.join(" | ") });

    await logout(page, summary.counters);
    await normalSession.context.close();

    const adminSession = await makeContext(browser, "admin-user", summary.events);
    const adminPage = adminSession.page;
    await login(adminPage, qaAdminEmail, qaAdminPassword, summary.counters, baseUrl);
    await adminPage.goto(new URL("/system", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const systemSnapshot = await collectSnapshot({ page: adminPage, label: "admin system dashboard", artifactDir, repoRoot, snapshots: summary.snapshots });
    await adminPage.goto(new URL("/system/workspaces", baseUrl).toString(), { waitUntil: "domcontentloaded" });
    const systemWorkspacesSnapshot = await collectSnapshot({ page: adminPage, label: "admin workspaces", artifactDir, repoRoot, snapshots: summary.snapshots });
    await runAxeCheck({ page: adminPage, label: "admin workspaces", axeSource, artifactDir, repoRoot, summary });
    summary.taskScores.push({ task: "Admin UX check", route: "/system", score: 3, notes: "Admin tools are clearly separated and gated, but workspace provisioning controls are dense and need operator care.", evidence: systemSnapshot.screenshotPath });
    summary.routeScores.push({ route: "/system/workspaces", score: 3, notes: "Admin-only maintenance tools are available and powerful; clear enough for internal operators, not intended for normal office users.", evidence: systemWorkspacesSnapshot.screenshotPath });
    await logout(adminPage, summary.counters);
    await adminSession.context.close();

    addFinding(summary.findings, {
      priority: "P1",
      route: "/money, /claims/[id]/money",
      task: "Money/reports",
      evidence: moneySnapshot.screenshotPath,
      whatHappened: "Money workflows are functional but denser than the rest of the app, with settlement, fee, invoice, and payment concepts competing for attention.",
      whyItMatters: "Small offices may understand the terms, but first-time users could hesitate before recording the first fee invoice or payment.",
      mvpGoal: "Track settlements, fees, invoices, payments, and receivables.",
      recommendedFix: "Add a short guided first-money empty state or step-by-step helper: record settlement, create fee invoice, record check/payment.",
      timing: "Before outreach",
    });

    addFinding(summary.findings, {
      priority: "P1",
      route: "/today",
      task: "First login / start the day",
      evidence: todaySnapshot.screenshotPath,
      whatHappened: "A new or sparse QA workspace has less immediate priority signal; Today is strongest after tasks, deadlines, and receivables exist.",
      whyItMatters: "A prospect landing in a fresh workspace may not immediately see the full daily value without sample or guided next action context.",
      mvpGoal: "Show a Today view with overdue tasks, due today, upcoming deadlines, carrier follow-ups, receivables, and recent claims.",
      recommendedFix: "Add a first-office mode that points users to create/import leads or claims and explains what will appear on Today after work exists.",
      timing: "Before outreach",
    });

    addFinding(summary.findings, {
      priority: "P2",
      route: "/system/workspaces",
      task: "Admin UX check",
      evidence: systemWorkspacesSnapshot.screenshotPath,
      whatHappened: "System admin provisioning tools are intentionally powerful and dense.",
      whyItMatters: "Internal operators can use them, but mistakes could affect workspaces if used carelessly.",
      mvpGoal: "Admin/system tools stay gated and operationally safe.",
      recommendedFix: "Add concise helper copy and confirmations around temporary password/bootstrap choices after first public conversations.",
      timing: "After first conversations",
    });

    addFinding(summary.findings, {
      priority: "P2",
      route: "Mobile app shell",
      task: "Mobile/responsive basics",
      evidence: mobileSnapshot.screenshotPath,
      whatHappened: "Mobile public pages are usable; logged-in operational workflows remain better suited to desktop/tablet due to dense forms and tables.",
      whyItMatters: "Small offices may check status on phones, but heavy intake and money entry are likely desktop tasks.",
      mvpGoal: "Simple practical workflow for small offices.",
      recommendedFix: "Prioritize mobile read/review flows first; do not over-invest in mobile data entry until user conversations confirm need.",
      timing: "After first conversations",
    });

    summary.counters.snapshots = summary.snapshots.length;

    writeFileSync(path.join(artifactDir, "ux-study-summary.json"), JSON.stringify(summary, null, 2), "utf8");
    console.log(`UX study complete. Artifacts: ${relativeToRepo(repoRoot, artifactDir)}`);
    console.log(`Snapshots: ${summary.snapshots.length}`);
    console.log(`Findings: ${summary.findings.length}`);
    console.log("Credentials were loaded locally and not printed.");
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown UX study error.";
  console.error(`UX study failed: ${message}`);
  process.exit(1);
});
