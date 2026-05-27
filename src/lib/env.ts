// Summarizes deployment environment mode for the in-app status card.
// Does NOT expose secret values — only yes/no/status labels.

export type AppEnvironment = "development" | "production";

export type EnvStatus = {
  nodeEnv: string;
  demoWorkspaceMode: "On" | "Off";
  localFileStorage: "On" | "Off";
  realAuth: "Not configured" | "Configured" | "Active";
  productionDatabase: "Local SQLite" | "External database";
  publicStatusLinks: "Enabled";
};

export function resolveAppEnvironment(): AppEnvironment {
  const configuredAppEnv = process.env.APP_ENV?.trim().toLowerCase();

  return configuredAppEnv === "production" ? "production" : "development";
}

export function resolveDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  return resolveAppEnvironment() === "production" ? "file:./prisma/production.db" : "file:./prisma/dev.db";
}

export function resolveAppBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return resolveAppEnvironment() === "production" ? "https://adjusterdesk.xyz" : "http://localhost:3000";
}

export function resolveUploadsDir() {
  const configuredDir = process.env.UPLOADS_DIR?.trim();
  if (configuredDir) {
    return configuredDir.replaceAll("\\", "/").replace(/\/+$/, "");
  }

  return resolveAppEnvironment() === "production" ? "storage/uploads-production" : "storage/uploads";
}

export function getEnvStatus({ authActive = false }: { authActive?: boolean } = {}): EnvStatus {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  // DATABASE_URL defaults to a file: path = local SQLite
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const productionDatabase: EnvStatus["productionDatabase"] =
    databaseUrl === "" || databaseUrl.startsWith("file:")
      ? "Local SQLite"
      : "External database";

  const authConfigured = Boolean(process.env.AUTH_SECRET?.trim());
  const demoWorkspaceMode: EnvStatus["demoWorkspaceMode"] = authActive || authConfigured ? "Off" : "On";

  // Local file storage is always On (no external storage env vars configured)
  const localFileStorage: EnvStatus["localFileStorage"] = "On";

  const realAuth: EnvStatus["realAuth"] = authActive
    ? "Active"
    : authConfigured
      ? "Configured"
      : "Not configured";

  // Public status links are always enabled in the current build
  const publicStatusLinks: EnvStatus["publicStatusLinks"] = "Enabled";

  return {
    nodeEnv,
    demoWorkspaceMode,
    localFileStorage,
    realAuth,
    productionDatabase,
    publicStatusLinks,
  };
}
