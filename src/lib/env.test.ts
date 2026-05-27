import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { getEnvStatus, resolveAppBaseUrl, resolveAppEnvironment, resolveDatabaseUrl, resolveUploadsDir } from "./env";

describe("env status helper", () => {
  afterEach(() => {
    delete process.env.APP_ENV;
    delete process.env.APP_BASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.UPLOADS_DIR;
    delete process.env.AUTH_SECRET;
  });

  it("reports local SQLite and demo mode when no env vars are set", () => {
    delete process.env.DATABASE_URL;
    const status = getEnvStatus();
    assert.equal(status.demoWorkspaceMode, "On");
    assert.equal(status.localFileStorage, "On");
    assert.equal(status.productionDatabase, "Local SQLite");
    assert.equal(status.realAuth, "Not configured");
    assert.equal(status.publicStatusLinks, "Enabled");
  });

  it("detects local SQLite when DATABASE_URL uses a file: path", () => {
    process.env.DATABASE_URL = "file:./prisma/dev.db";
    const status = getEnvStatus();
    assert.equal(status.productionDatabase, "Local SQLite");
  });

  it("detects external database when DATABASE_URL is a non-file URL", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    const status = getEnvStatus();
    assert.equal(status.productionDatabase, "External database");
  });

  it("falls back to the production SQLite database when APP_ENV is production", () => {
    process.env.APP_ENV = "production";
    assert.equal(resolveAppEnvironment(), "production");
    assert.equal(resolveDatabaseUrl(), "file:./prisma/production.db");
    assert.equal(resolveUploadsDir(), "storage/uploads-production");
    assert.equal(resolveAppBaseUrl(), "https://adjusterdesk.xyz");
  });

  it("keeps development defaults when APP_ENV is not production", () => {
    process.env.APP_ENV = "development";
    assert.equal(resolveAppEnvironment(), "development");
    assert.equal(resolveDatabaseUrl(), "file:./prisma/dev.db");
    assert.equal(resolveUploadsDir(), "storage/uploads");
    assert.equal(resolveAppBaseUrl(), "http://localhost:3000");
  });

  it("reports auth as configured when AUTH_SECRET is present", () => {
    process.env.AUTH_SECRET = "some-secret";
    const status = getEnvStatus();
    assert.equal(status.realAuth, "Configured");
    assert.equal(status.demoWorkspaceMode, "Off");
  });

  it("reports auth as active for an authenticated session view", () => {
    const status = getEnvStatus({ authActive: true });
    assert.equal(status.realAuth, "Active");
    assert.equal(status.demoWorkspaceMode, "Off");
  });

  it("includes NODE_ENV in the output", () => {
    const status = getEnvStatus();
    assert.ok(status.nodeEnv.length > 0);
  });
});
