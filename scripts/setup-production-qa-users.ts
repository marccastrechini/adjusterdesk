import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";
import { resolveAppBaseUrl, resolveDatabaseUrl, resolveUploadsDir } from "../src/lib/env";

type CliOptions = {
  confirmProductionQaSetup: boolean;
  userEmail: string;
  adminEmail: string;
  outreachEmail: string;
  workspaceName: string;
  userPassword?: string;
  adminPassword?: string;
  outreachPassword?: string;
};

type UpsertResult = "created" | "updated";

type UserResult = {
  email: string;
  result: UpsertResult;
};

const expectedAppEnv = "production";
const expectedAppBaseUrl = "https://adjusterdesk.xyz";
const expectedDatabaseFragment = "production.db";
const expectedUploadsFragment = "uploads-production";

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    confirmProductionQaSetup: false,
    userEmail: "qa.user@adjusterdesk.xyz",
    adminEmail: "qa.admin@adjusterdesk.xyz",
    outreachEmail: "qa.outreach@adjusterdesk.xyz",
    workspaceName: "AdjusterDesk QA",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "-ConfirmProductionQaSetup" || arg === "--ConfirmProductionQaSetup" || arg === "--confirm-production-qa-setup") {
      options.confirmProductionQaSetup = true;
      continue;
    }

    if (!next || next.startsWith("-")) {
      continue;
    }

    if (arg === "--user-email") {
      options.userEmail = next;
      index += 1;
      continue;
    }

    if (arg === "--admin-email") {
      options.adminEmail = next;
      index += 1;
      continue;
    }

    if (arg === "--workspace-name") {
      options.workspaceName = next;
      index += 1;
      continue;
    }

    if (arg === "--outreach-email") {
      options.outreachEmail = next;
      index += 1;
      continue;
    }

    if (arg === "--user-password") {
      options.userPassword = next;
      index += 1;
      continue;
    }

    if (arg === "--admin-password") {
      options.adminPassword = next;
      index += 1;
      continue;
    }

    if (arg === "--outreach-password") {
      options.outreachPassword = next;
      index += 1;
      continue;
    }
  }

  return options;
}

function loadEnvFile(filePath: string, overwrite = false) {
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

function loadProductionProfile(repoRoot: string) {
  const sharedEnvPath = path.join(repoRoot, ".env");
  const productionEnvPath = path.join(repoRoot, ".env.production.local");

  loadEnvFile(sharedEnvPath, false);

  if (!existsSync(productionEnvPath)) {
    throw new Error("Missing .env.production.local. Create the production profile before running QA setup.");
  }

  loadEnvFile(productionEnvPath, true);

  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv !== expectedAppEnv) {
    throw new Error("Refusing to run. APP_ENV must be production.");
  }

  const appBaseUrl = resolveAppBaseUrl();
  if (appBaseUrl !== expectedAppBaseUrl) {
    throw new Error("Refusing to run. APP_BASE_URL must be https://adjusterdesk.xyz.");
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl.includes(expectedDatabaseFragment)) {
    throw new Error("Refusing to run. DATABASE_URL must target production.db.");
  }

  const uploadsDir = resolveUploadsDir();
  if (!uploadsDir.includes(expectedUploadsFragment)) {
    throw new Error("Refusing to run. UPLOADS_DIR must target uploads-production.");
  }

  return {
    appBaseUrl,
    databaseUrl,
  };
}

function ensureValidEmail(value: string, fieldName: string) {
  const email = value.trim().toLowerCase();
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new Error(`${fieldName} must be a valid email address.`);
  }
  return email;
}

function generateStrongPassword(length = 24) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^*-_";
  const bytes = randomBytes(length);
  let generated = "";

  for (let i = 0; i < length; i += 1) {
    generated += alphabet[bytes[i] % alphabet.length];
  }

  return generated;
}

function ensurePassword(input: string | undefined) {
  const password = input?.trim() || generateStrongPassword();

  if (password.length < 12) {
    throw new Error("Passwords must be at least 12 characters.");
  }

  return password;
}

function writeLocalQaCredentials(args: {
  repoRoot: string;
  userEmail: string;
  userPassword: string;
  adminEmail: string;
  adminPassword: string;
  outreachEmail: string;
  outreachPassword: string;
  baseUrl: string;
}) {
  const qaEnvPath = path.join(args.repoRoot, ".env.qa.local");
  const content = [
    "# Local-only production QA credentials for smoke tests",
    "# This file is gitignored and must never be committed.",
    `AD_QA_USER_EMAIL=${args.userEmail}`,
    `AD_QA_USER_PASSWORD=${args.userPassword}`,
    `AD_QA_ADMIN_EMAIL=${args.adminEmail}`,
    `AD_QA_ADMIN_PASSWORD=${args.adminPassword}`,
    `AD_QA_OUTREACH_EMAIL=${args.outreachEmail}`,
    `AD_QA_OUTREACH_PASSWORD=${args.outreachPassword}`,
    `AD_QA_BASE_URL=${args.baseUrl}`,
    "",
  ].join("\n");

  writeFileSync(qaEnvPath, content, "utf8");

  return qaEnvPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.confirmProductionQaSetup) {
    throw new Error("Refusing to run without -ConfirmProductionQaSetup.");
  }

  const repoRoot = process.cwd();
  const runtime = loadProductionProfile(repoRoot);
  const qaEnvPath = path.join(repoRoot, ".env.qa.local");
  loadEnvFile(qaEnvPath, false);

  const userEmail = ensureValidEmail(options.userEmail, "QA user email");
  const adminEmail = ensureValidEmail(options.adminEmail, "QA admin email");
  const outreachEmail = ensureValidEmail(options.outreachEmail, "QA outreach email");

  if (userEmail === adminEmail) {
    throw new Error("QA user and QA admin emails must be different.");
  }

  if (outreachEmail === userEmail || outreachEmail === adminEmail) {
    throw new Error("QA outreach email must be different from the normal QA and admin QA emails.");
  }

  const workspaceName = options.workspaceName.trim();
  if (!workspaceName) {
    throw new Error("Workspace name cannot be empty.");
  }

  const userPassword = ensurePassword(options.userPassword);
  const adminPassword = ensurePassword(options.adminPassword);
  const outreachPasswordExplicit = options.outreachPassword?.trim();
  const storedOutreachPassword = process.env.AD_QA_OUTREACH_PASSWORD?.trim() || undefined;
  const outreachPassword = outreachPasswordExplicit || storedOutreachPassword || generateStrongPassword();

  if (outreachPasswordExplicit && outreachPasswordExplicit.length < 12) {
    throw new Error("QA outreach password must be at least 12 characters when provided.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: runtime.databaseUrl }),
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      let workspaceResult: UpsertResult = "updated";

      let workspace = await tx.firm.findFirst({
        where: { name: workspaceName },
        select: { id: true, name: true },
      });

      if (!workspace) {
        workspace = await tx.firm.create({
          data: { name: workspaceName, email: "qa@adjusterdesk.xyz" },
          select: { id: true, name: true },
        });
        workspaceResult = "created";
      }

      const existingUser = await tx.user.findUnique({ where: { email: userEmail }, select: { id: true } });
      const existingAdmin = await tx.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
      const existingOutreach = await tx.user.findUnique({ where: { email: outreachEmail }, select: { id: true } });

      if (existingOutreach && !outreachPasswordExplicit && !storedOutreachPassword) {
        throw new Error("Existing QA outreach user found. Provide --outreach-password or keep AD_QA_OUTREACH_PASSWORD in .env.qa.local.");
      }

      const qaUser = await tx.user.upsert({
        where: { email: userEmail },
        create: {
          firmId: workspace.id,
          name: "QA User",
          email: userEmail,
          passwordHash: hashPassword(userPassword),
          role: UserRole.ADJUSTER,
          isSystemAdmin: false,
          active: true,
        },
        update: {
          firmId: workspace.id,
          name: "QA User",
          passwordHash: hashPassword(userPassword),
          role: UserRole.ADJUSTER,
          isSystemAdmin: false,
          active: true,
        },
        select: { id: true, email: true, isSystemAdmin: true, role: true },
      });

      const qaAdmin = await tx.user.upsert({
        where: { email: adminEmail },
        create: {
          firmId: workspace.id,
          name: "QA Admin",
          email: adminEmail,
          passwordHash: hashPassword(adminPassword),
          role: UserRole.OWNER,
          isSystemAdmin: true,
          active: true,
        },
        update: {
          firmId: workspace.id,
          name: "QA Admin",
          passwordHash: hashPassword(adminPassword),
          role: UserRole.OWNER,
          isSystemAdmin: true,
          active: true,
        },
        select: { id: true, email: true, isSystemAdmin: true, role: true },
      });

      const qaOutreach = await tx.user.upsert({
        where: { email: outreachEmail },
        create: {
          firmId: workspace.id,
          name: "QA Outreach Operator",
          email: outreachEmail,
          passwordHash: hashPassword(outreachPassword),
          role: UserRole.ADJUSTER,
          isSystemAdmin: false,
          isOutreachOperator: true,
          active: true,
        },
        update: {
          firmId: workspace.id,
          name: "QA Outreach Operator",
          ...(outreachPasswordExplicit ? { passwordHash: hashPassword(outreachPassword) } : {}),
          role: UserRole.ADJUSTER,
          isSystemAdmin: false,
          isOutreachOperator: true,
          active: true,
        },
        select: { id: true, email: true, isSystemAdmin: true, isOutreachOperator: true, role: true },
      });

      if (qaUser.isSystemAdmin) {
        throw new Error("Safety check failed: normal QA user must not have system admin access.");
      }

      if (!qaAdmin.isSystemAdmin) {
        throw new Error("Safety check failed: admin QA user must have system admin access.");
      }

      if (qaOutreach.isSystemAdmin) {
        throw new Error("Safety check failed: outreach QA user must not have system admin access.");
      }

      if (!qaOutreach.isOutreachOperator) {
        throw new Error("Safety check failed: outreach QA user must have outreach operator access.");
      }

      await tx.passwordResetToken.deleteMany({ where: { userId: { in: [qaUser.id, qaAdmin.id, qaOutreach.id] } } });
      await tx.userInvitationToken.deleteMany({ where: { userId: { in: [qaUser.id, qaAdmin.id, qaOutreach.id] } } });

      const qaEnvPathWritten = writeLocalQaCredentials({
        repoRoot,
        userEmail,
        userPassword,
        adminEmail,
        adminPassword,
        outreachEmail,
        outreachPassword,
        baseUrl: runtime.appBaseUrl,
      });

      return {
        workspaceName: workspace.name,
        workspaceResult,
        user: { email: qaUser.email, result: existingUser ? "updated" : "created" } as UserResult,
        admin: { email: qaAdmin.email, result: existingAdmin ? "updated" : "created" } as UserResult,
        outreach: { email: qaOutreach.email, result: existingOutreach ? "updated" : "created" } as UserResult,
        qaEnvPath: qaEnvPathWritten,
      };
    });

    console.log("Production QA user setup complete.");
    console.log(`Workspace: ${result.workspaceName} (${result.workspaceResult})`);
    console.log(`Normal QA user: ${result.user.email} (${result.user.result})`);
    console.log(`Admin QA user: ${result.admin.email} (${result.admin.result})`);
    console.log(`Outreach QA user: ${result.outreach.email} (${result.outreach.result})`);
    console.log(`Credentials saved to: ${result.qaEnvPath}`);
    console.log("Password values were written to the local file only and were not printed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown setup error.";
  console.error(`Production QA setup failed: ${message}`);
  process.exit(1);
});
