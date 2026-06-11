import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadLocalQaEnv(repoRoot: string) {
  const qaEnvPath = path.join(repoRoot, ".env.qa.local");

  if (!existsSync(qaEnvPath)) {
    return {
      qaEnvPath,
      loaded: false,
    };
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

  return {
    qaEnvPath,
    loaded: true,
  };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  execFileSync(command, args, {
    stdio: "inherit",
    env,
  });
}

async function main() {
  const repoRoot = process.cwd();
  const { qaEnvPath, loaded } = loadLocalQaEnv(repoRoot);

  const baseUrl = process.env.AD_QA_BASE_URL?.trim() || "https://adjusterdesk.xyz";

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
  };

  const playwrightCli = path.join(repoRoot, "node_modules", "playwright", "cli.js");

  console.log(`Running production smoke against ${baseUrl}`);
  console.log(loaded ? `Loaded local QA env file: ${qaEnvPath}` : `No .env.qa.local found at ${qaEnvPath}. Authenticated tests may be skipped.`);

  run(process.execPath, [playwrightCli, "install", "chromium"], env);
  run(process.execPath, [playwrightCli, "test", "tests/smoke/production-qa.spec.ts"], env);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown production smoke error.";
  console.error(`Production smoke failed: ${message}`);
  process.exit(1);
});
