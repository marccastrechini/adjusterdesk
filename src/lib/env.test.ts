import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { getEnvStatus } from "./env";

describe("env status helper", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_TOKEN;
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

  it("reports auth as configured when AUTH_SECRET is present", () => {
    process.env.AUTH_SECRET = "some-secret";
    const status = getEnvStatus();
    assert.equal(status.realAuth, "Configured");
  });

  it("reports auth as configured when NEXTAUTH_SECRET is present", () => {
    process.env.NEXTAUTH_SECRET = "some-secret";
    const status = getEnvStatus();
    assert.equal(status.realAuth, "Configured");
  });

  it("includes NODE_ENV in the output", () => {
    const status = getEnvStatus();
    assert.ok(status.nodeEnv.length > 0);
  });
});
