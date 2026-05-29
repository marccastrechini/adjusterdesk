export type DemoSeedTargetInput = {
  appEnv?: string;
  databaseUrl?: string;
};

export type DemoSeedTargetResult = {
  safe: boolean;
  reason?: string;
};

function normalizeAppEnv(appEnv: string | undefined) {
  return appEnv?.trim().toLowerCase() ?? "";
}

function normalizeDatabaseUrl(databaseUrl: string | undefined) {
  return (databaseUrl?.trim() || "file:./prisma/dev.db").replaceAll("\\", "/");
}

function sqliteFilePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return undefined;
  }

  return databaseUrl.slice("file:".length).split("?")[0].replaceAll("\\", "/");
}

export function checkDemoSeedTarget({ appEnv, databaseUrl }: DemoSeedTargetInput): DemoSeedTargetResult {
  const normalizedAppEnv = normalizeAppEnv(appEnv);
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);

  if (normalizedAppEnv === "production") {
    return {
      safe: false,
      reason: "APP_ENV=production is not allowed for the full demo seed reset.",
    };
  }

  const databasePath = sqliteFilePath(normalizedDatabaseUrl);
  if (!databasePath) {
    return {
      safe: false,
      reason: "The full demo seed reset only runs against the local SQLite dev.db file.",
    };
  }

  if (/(^|\/)production\.db$/i.test(databasePath)) {
    return {
      safe: false,
      reason: "production.db is not allowed for the full demo seed reset.",
    };
  }

  if (!/(^|\/)dev\.db$/i.test(databasePath)) {
    return {
      safe: false,
      reason: `The full demo seed reset expected a dev.db SQLite target, but found ${normalizedDatabaseUrl}.`,
    };
  }

  return { safe: true };
}

export function assertDemoSeedTarget(input: DemoSeedTargetInput) {
  const result = checkDemoSeedTarget(input);

  if (!result.safe) {
    throw new Error(`Demo seed reset refused. ${result.reason}`);
  }
}