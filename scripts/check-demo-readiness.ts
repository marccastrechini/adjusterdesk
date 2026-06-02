import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { resolveAppBaseUrl, resolveDatabaseUrl } from "../src/lib/env";

type Profile = "development" | "production";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

type ExpectedUser = {
  email: string;
  role: UserRole;
};

const profileConfig: Record<Profile, { workspaceName: string; users: ExpectedUser[]; defaultBaseUrl: string }> = {
  development: {
    workspaceName: "Harbor Public Adjusting",
    defaultBaseUrl: "http://localhost:3000",
    users: [
      { email: "dana@harboradjusting.example", role: UserRole.OWNER },
      { email: "luis@harboradjusting.example", role: UserRole.ADJUSTER },
      { email: "kim@harboradjusting.example", role: UserRole.ASSISTANT },
    ],
  },
  production: {
    workspaceName: "AdjusterDesk Demo Office",
    defaultBaseUrl: "https://adjusterdesk.xyz",
    users: [
      { email: "demo.owner@adjusterdesk.xyz", role: UserRole.OWNER },
      { email: "demo.adjuster@adjusterdesk.xyz", role: UserRole.ADJUSTER },
      { email: "demo.assistant@adjusterdesk.xyz", role: UserRole.ASSISTANT },
    ],
  },
};

const appRoutes = [
  ["/start", "src/app/(app)/start/page.tsx"],
  ["/start/import", "src/app/(app)/start/import/page.tsx"],
  ["/today", "src/app/(app)/today/page.tsx"],
  ["/leads", "src/app/(app)/leads/page.tsx"],
  ["/claims", "src/app/(app)/claims/page.tsx"],
  ["/money", "src/app/(app)/money/page.tsx"],
  ["/reports", "src/app/(app)/reports/page.tsx"],
  ["/office-resources", "src/app/(app)/office-resources/page.tsx"],
  ["/feedback", "src/app/(app)/feedback/page.tsx"],
  ["/settings/import", "src/app/(app)/settings/import/page.tsx"],
] as const;

const publicRoutes = [
  { path: "/", expectedText: "AdjusterDesk" },
  { path: "/product", expectedText: "Lead and client intake" },
  { path: "/features", expectedText: "Claim tracking" },
  { path: "/how-it-works", expectedText: "Bring over the basics" },
  { path: "/pricing", expectedText: "Choose the package that matches how your office works today." },
  { path: "/resources", expectedText: "Importing from spreadsheets" },
  { path: "/demo", expectedText: "Email Demo Request" },
] as const;

function parseArgs(argv: string[]) {
  const options: { profile: Profile; baseUrl?: string } = { profile: "development" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--profile" || arg === "-Profile") && next) {
      if (next !== "development" && next !== "production") {
        throw new Error("--profile must be development or production.");
      }

      options.profile = next;
      index += 1;
      continue;
    }

    if ((arg === "--base-url" || arg === "-BaseUrl") && next) {
      options.baseUrl = next.replace(/\/+$/, "");
      index += 1;
    }
  }

  return options;
}

function loadEnvFile(filePath: string, overwrite: boolean) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (overwrite || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadProfileEnv(profile: Profile) {
  const repoRoot = process.cwd();
  loadEnvFile(path.join(repoRoot, ".env"), false);

  const profileEnvPath = path.join(repoRoot, `.env.${profile}.local`);
  if (existsSync(profileEnvPath)) {
    loadEnvFile(profileEnvPath, true);
  } else if (profile === "production") {
    throw new Error(`Missing ${profileEnvPath}. Production readiness requires the production profile file.`);
  }

  process.env.APP_ENV = profile;
}

function ok(name: string, detail: string): CheckResult {
  return { name, ok: true, detail };
}

function fail(name: string, error: unknown): CheckResult {
  const detail = error instanceof Error ? error.message : String(error);
  return { name, ok: false, detail };
}

async function runCheck(name: string, check: () => Promise<string> | string): Promise<CheckResult> {
  try {
    return ok(name, await check());
  } catch (error) {
    return fail(name, error);
  }
}

async function verifyDatabaseConnectivity(prisma: PrismaClient) {
  await prisma.$queryRawUnsafe("SELECT 1");
  return "Database connection opened and SELECT 1 succeeded.";
}

async function verifySeededWorkspace(prisma: PrismaClient, profile: Profile) {
  const expected = profileConfig[profile];
  const firm = await prisma.firm.findFirst({
    where: { name: expected.workspaceName },
    select: { id: true, name: true },
  });

  if (!firm) {
    throw new Error(`Missing seeded workspace ${expected.workspaceName}.`);
  }

  const users = await prisma.user.findMany({
    where: { firmId: firm.id, email: { in: expected.users.map((user) => user.email) } },
    select: { email: true, role: true, active: true },
  });

  for (const expectedUser of expected.users) {
    const user = users.find((candidate) => candidate.email === expectedUser.email);
    if (!user) {
      throw new Error(`Missing seeded user ${expectedUser.email}.`);
    }

    if (!user.active) {
      throw new Error(`Seeded user ${expectedUser.email} is inactive.`);
    }

    if (user.role !== expectedUser.role) {
      throw new Error(`Seeded user ${expectedUser.email} has role ${user.role}, expected ${expectedUser.role}.`);
    }
  }

  return `Workspace ${firm.name} and ${expected.users.length} active demo users found.`;
}

async function verifyFeedbackEntry(prisma: PrismaClient, profile: Profile) {
  const expected = profileConfig[profile];
  const firm = await prisma.firm.findFirstOrThrow({ where: { name: expected.workspaceName }, select: { id: true } });
  const user = await prisma.user.findFirst({ where: { firmId: firm.id, email: expected.users[0].email }, select: { id: true } });
  const message = `Readiness check ${new Date().toISOString()}`;

  const feedback = await prisma.feedbackEntry.create({
    data: {
      firmId: firm.id,
      userId: user?.id,
      page: "readiness-check",
      rating: 5,
      message,
    },
    select: { id: true },
  });

  await prisma.feedbackEntry.delete({ where: { id: feedback.id } });
  return "Feedback table accepted a create/delete readiness probe.";
}

function verifyRouteFiles() {
  const missingRoutes = appRoutes.filter(([, routeFile]) => !existsSync(path.join(process.cwd(), routeFile)));

  if (missingRoutes.length > 0) {
    throw new Error(`Missing route files: ${missingRoutes.map(([route]) => route).join(", ")}.`);
  }

  return `${appRoutes.length} demo app route files found.`;
}

async function verifyPublicRoutes(baseUrl: string) {
  for (const route of publicRoutes) {
    const response = await fetch(`${baseUrl}${route.path}`);
    if (!response.ok) {
      throw new Error(`${route.path} returned HTTP ${response.status}.`);
    }

    const body = await response.text();
    if (!body.includes(route.expectedText)) {
      throw new Error(`${route.path} did not include expected text: ${route.expectedText}`);
    }
  }

  return `${publicRoutes.length} public marketing routes rendered from ${baseUrl}.`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadProfileEnv(options.profile);

  const databaseUrl = resolveDatabaseUrl();
  const baseUrl = options.baseUrl ?? resolveAppBaseUrl() ?? profileConfig[options.profile].defaultBaseUrl;

  if (options.profile === "production" && !databaseUrl.includes("production.db")) {
    throw new Error("Production readiness refused because DATABASE_URL does not point to production.db.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });

  const results: CheckResult[] = [];

  try {
    results.push(await runCheck("database connectivity", () => verifyDatabaseConnectivity(prisma)));
    results.push(await runCheck("seeded demo workspace/users", () => verifySeededWorkspace(prisma, options.profile)));
    results.push(await runCheck("feedback model", () => verifyFeedbackEntry(prisma, options.profile)));
    results.push(await runCheck("demo app routes", verifyRouteFiles));
    results.push(await runCheck("public marketing routes", () => verifyPublicRoutes(baseUrl)));
  } finally {
    await prisma.$disconnect();
  }

  for (const result of results) {
    const marker = result.ok ? "PASS" : "FAIL";
    console.log(`${marker} ${result.name}: ${result.detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }

  console.log("Demo readiness check complete.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Demo readiness check failed: ${message}`);
  process.exit(1);
});