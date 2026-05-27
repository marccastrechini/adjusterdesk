import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";

type CliOptions = {
  email: string;
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

    if (arg === "--email") {
      options.email = value;
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
    "  npm run admin:reset-password -- --email \"steve@starkloss.example\" [--password \"NewPassword123!\"]",
  );
}

function normalizeInput(raw: Partial<CliOptions>): CliOptions {
  const email = raw.email?.trim().toLowerCase() ?? "";
  const password = raw.password?.trim();

  if (!email) {
    throw new Error("Missing required input. Provide --email.");
  }

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new Error("Email must be a valid email address.");
  }

  if (password && password.length < 8) {
    throw new Error("Password must be at least 8 characters when provided.");
  }

  return {
    email,
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
    const user = await prisma.user.findUnique({
      where: { email: options.email },
      select: { id: true, name: true, email: true, firmId: true },
    });

    if (!user) {
      throw new Error(`No user found with email ${options.email}.`);
    }

    const firm = await prisma.firm.findUnique({
      where: { id: user.firmId },
      select: { name: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log("Password reset complete.");
    console.log(`User: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Workspace: ${firm?.name ?? user.firmId}`);

    if (generatedTemporaryPassword) {
      console.log(`Temporary password (shown once): ${password}`);
      console.log("Save this temporary password now and share it with the user to rotate after first sign-in.");
    } else {
      console.log("Password set from --password input.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Password reset failed: ${message}`);
  printUsage();
  process.exit(1);
});
