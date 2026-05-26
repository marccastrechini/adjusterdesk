// Summarizes deployment environment mode for the in-app status card.
// Does NOT expose secret values — only yes/no/status labels.

export type EnvStatus = {
  nodeEnv: string;
  demoWorkspaceMode: "On";
  localFileStorage: "On" | "Off";
  realAuth: "Not configured" | "Configured";
  productionDatabase: "Local SQLite" | "External database";
  publicStatusLinks: "Enabled";
};

export function getEnvStatus(): EnvStatus {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  // DATABASE_URL defaults to a file: path = local SQLite
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const productionDatabase: EnvStatus["productionDatabase"] =
    databaseUrl === "" || databaseUrl.startsWith("file:")
      ? "Local SQLite"
      : "External database";

  // Demo workspace mode is always On until real auth is wired
  const demoWorkspaceMode: EnvStatus["demoWorkspaceMode"] = "On";

  // Local file storage is always On (no external storage env vars configured)
  const localFileStorage: EnvStatus["localFileStorage"] = "On";

  // Real auth: check for common auth secret env var presence only
  const authConfigured =
    !!process.env.AUTH_SECRET ||
    !!process.env.NEXTAUTH_SECRET ||
    !!process.env.AUTH_TOKEN;
  const realAuth: EnvStatus["realAuth"] = authConfigured
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
