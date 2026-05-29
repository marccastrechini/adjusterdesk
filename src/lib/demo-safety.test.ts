import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkDemoSeedTarget } from "./demo-safety";

describe("demo seed safety", () => {
  it("allows the default local dev database", () => {
    assert.equal(checkDemoSeedTarget({}).safe, true);
    assert.equal(checkDemoSeedTarget({ appEnv: "development", databaseUrl: "file:./prisma/dev.db" }).safe, true);
  });

  it("blocks production mode", () => {
    const result = checkDemoSeedTarget({ appEnv: "production", databaseUrl: "file:./prisma/dev.db" });

    assert.equal(result.safe, false);
    assert.match(result.reason ?? "", /APP_ENV=production/);
  });

  it("blocks production sqlite targets", () => {
    const result = checkDemoSeedTarget({ appEnv: "development", databaseUrl: "file:./prisma/production.db" });

    assert.equal(result.safe, false);
    assert.match(result.reason ?? "", /production\.db/);
  });

  it("blocks external database targets", () => {
    const result = checkDemoSeedTarget({ appEnv: "development", databaseUrl: "postgres://example" });

    assert.equal(result.safe, false);
    assert.match(result.reason ?? "", /local SQLite dev\.db/);
  });
});