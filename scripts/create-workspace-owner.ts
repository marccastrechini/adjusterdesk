import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";

type CliOptions = {
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  password?: string;
};

function parseArgs(argv: string[]): Partial<CliOptions> {
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (!arg.startsWith("--")) {
      continue;
    }

    if (!value || value.startsWith("--")) {
      continue;
    }

    if (arg === "--workspace-name") {
      options.workspaceName = value;
      i += 1;
      continue;
    }

    if (arg === "--owner-name") {
      options.ownerName = value;
      i += 1;
      continue;
    }

    if (arg === "--owner-email") {
      options.ownerEmail = value;
      i += 1;
      continue;
    }

    if (arg === "--password") {
      options.password = value;
      i += 1;
      continue;
    }
  }

  return options;
}

function printUsage() {
  console.log("Usage:");
  console.log(
    "  npm run admin:create-workspace -- --workspace-name \"Stark Loss\" --owner-name \"Steve Reardon\" --owner-email \"steve@starkloss.example\" [--password \"your-password\"]",
  );
}

function normalizeInput(raw: Partial<CliOptions>): CliOptions {
  const workspaceName = raw.workspaceName?.trim() ?? "";
  const ownerName = raw.ownerName?.trim() ?? "";
  const ownerEmail = raw.ownerEmail?.trim().toLowerCase() ?? "";
  const password = raw.password?.trim();

  if (!workspaceName || !ownerName || !ownerEmail) {
    throw new Error("Missing required inputs. Provide workspace name, owner name, and owner email.");
  }

  if (!ownerEmail.includes("@") || ownerEmail.startsWith("@") || ownerEmail.endsWith("@")) {
    throw new Error("Owner email must be a valid email address.");
  }

  if (password && password.length < 8) {
    throw new Error("Password must be at least 8 characters when provided.");
  }

  return {
    workspaceName,
    ownerName,
    ownerEmail,
    ...(password ? { password } : {}),
  };
}

function generateTemporaryPassword(length = 18) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^*-_";
  const bytes = randomBytes(length);
  let generated = "";

  for (let i = 0; i < length; i += 1) {
    generated += alphabet[bytes[i] % alphabet.length];
  }

  return generated;
}

async function main() {
  const rawOptions = parseArgs(process.argv.slice(2));
  const options = normalizeInput(rawOptions);

  const password = options.password ?? generateTemporaryPassword();
  const passwordHash = hashPassword(password);
  const generatedTemporaryPassword = !options.password;

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    }),
  });

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: options.ownerEmail },
      select: { id: true, firmId: true },
    });

    if (existingUser) {
      throw new Error(`A user with email ${options.ownerEmail} already exists.`);
    }

    const existingFirm = await prisma.firm.findFirst({
      where: { name: options.workspaceName },
      select: { id: true },
    });

    if (existingFirm) {
      throw new Error(`A workspace named ${options.workspaceName} already exists.`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const firm = await tx.firm.create({
        data: {
          name: options.workspaceName,
        },
      });

      const owner = await tx.user.create({
        data: {
          firmId: firm.id,
          name: options.ownerName,
          email: options.ownerEmail,
          passwordHash,
          role: UserRole.OWNER,
          active: true,
        },
      });

      return {
        firm,
        owner,
      };
    });

    console.log("Workspace provisioning complete.");
    console.log(`Workspace: ${result.firm.name}`);
    console.log(`Workspace ID: ${result.firm.id}`);
    console.log(`Owner: ${result.owner.name}`);
    console.log(`Owner email: ${result.owner.email}`);
    console.log(`Owner role: ${result.owner.role}`);

    if (generatedTemporaryPassword) {
      console.log(`Temporary password (shown once): ${password}`);
      console.log("Save this temporary password now and rotate it after first login.");
    } else {
      console.log("Owner password set from --password input.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown provisioning error.";
  console.error(`Provisioning failed: ${message}`);
  printUsage();
  process.exit(1);
});
